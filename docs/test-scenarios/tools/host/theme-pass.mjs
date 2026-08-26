/*
 * The theme pass, behind one call per screen (US-18, ADR-0020).
 *
 * Host half. The page half is `../theme-audit.js`, which is not rewritten here: it
 * is browser-side, dependency-free, driver-agnostic, it returns a raw object and it
 * refuses on purpose to emulate the theme. What was missing is everything around it —
 * injecting it once, emulating the two themes, walking the nine screens, and
 * collecting eighteen raw readings. That is the largest repeated block of the suite
 * and the one with no judgement in it at all.
 *
 * It drives; it does not judge. No reading is compared to anything expected. The one
 * thing it asserts is the **mechanism**: that the theme it measured is the theme it
 * asked for. Colour-scheme emulation has failed in both directions across four runs —
 * a light pass that measured dark, and an emulation that survived a detach — and an
 * assertion inside the audited script is the only thing that ever caught either. So
 * the helper throws rather than hand back a plausible reading of a theme that never
 * rendered.
 *
 * The inventory of screens is NOT written here. It is read from `../theme-pass.md`,
 * which is the one place it is edited: a second copy is how a screen reachable from
 * the navigation belonged to no scenario for a whole run.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { emulateTheme, open } from "./cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const THEME_PASS_DOC = join(HERE, "..", "..", "theme-pass.md");
export const THEME_AUDIT_SOURCE = join(HERE, "..", "theme-audit.js");

export const THEMES = ["light", "dark"];

/* ------------------------------------------------------------------ inventory */

/**
 * The screens `theme-pass.md` declares, read off its own table.
 *
 * Each row is `| n | Name (\`/route\`) | reached by … |`. A screen is *in the
 * navigation* when its "Reached by" cell says so; the other two are opened from a
 * list, and forgetting them is how a pass silently shrinks.
 */
export function parseScreenInventory(markdown) {
  const rows = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^\|\s*\d+\s*\|/.test(l));

  return rows.map((line) => {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    const [number, screen, reachedBy] = cells;
    const named = screen.match(/^(.*?)\s*\(`([^`]+)`\)/);
    if (!named) throw new Error(`theme-pass.md row ${number} does not name a route: ${screen}`);
    return {
      number: Number(number),
      name: named[1],
      route: named[2],
      inNav: /^navigation\b/.test(reachedBy),
      reachedBy,
    };
  });
}

/** How many audits a pass owes: every screen, in both themes. */
export function plannedAudits(screens) {
  return screens.length * THEMES.length;
}

/* -------------------------------------------------------- the injected script */

/**
 * The expression evaluated on the page: the audit's own source, a guard on the port,
 * and the theme assertion.
 *
 * Both guards are load-bearing rather than defensive. The port guard is what kept
 * every action off a sibling agent's app when a shared browser stole the selected
 * page ~20 times in one parallel run. The theme assertion is what caught two runs
 * that audited the dark palette twice and would have reported a green light theme
 * that never rendered.
 */
export function auditScript({ port, theme, source }) {
  if (!THEMES.includes(theme)) {
    throw new Error(`Unknown theme ${JSON.stringify(theme)}: the pass runs ${THEMES.join(" and ")}.`);
  }
  const wanted = theme === "dark";
  return `(() => {
  if (location.port !== ${JSON.stringify(String(port))}) {
    throw new Error("port guard: this is " + location.port + ", not ${port} — refusing to act on another agent's app");
  }
  const measured = matchMedia("(prefers-color-scheme: dark)").matches;
  if (measured !== ${wanted}) {
    throw new Error("theme guard: asked for ${theme}, the page measures " + (measured ? "dark" : "light") + " — the emulation did not take");
  }
  ${source}
  return JSON.stringify(themeAudit());
})()`;
}

/** The audit's source, read once and injected per document. */
export function themeAuditSource() {
  return readFileSync(THEME_AUDIT_SOURCE, "utf8");
}

/** The inventory as the document currently declares it. */
export function screensFromDoc() {
  return parseScreenInventory(readFileSync(THEME_PASS_DOC, "utf8"));
}

/* ------------------------------------------------------------------- the walk */


const guard = (port) =>
  `if (location.port !== ${JSON.stringify(String(port))}) throw new Error("port guard: this is " + location.port + ", not ${port}");`;

/**
 * What the screen currently is: its path, and how much text its main landmark
 * holds. Two identical readings in a row is this library's definition of "rendered" —
 * a mechanism postcondition, not a judgement about the content.
 */
const stateExpr = (port) => `(() => {
  ${guard(port)}
  const main = document.querySelector("main") || document.body;
  return JSON.stringify({ path: location.pathname, len: main.innerText.length });
})()`;

async function waitForScreen(session, port, matches, { timeoutMs = 20000, settleMs = 180 } = {}) {
  const until = Date.now() + timeoutMs;
  let previous = null;
  let last = null;
  while (Date.now() < until) {
    const state = JSON.parse(await session.evaluate(stateExpr(port)));
    last = state;
    if (matches(state.path) && state.len > 0 && previous && previous.len === state.len) return state;
    previous = matches(state.path) ? state : null;
    await new Promise((r) => setTimeout(r, settleMs));
  }
  throw new Error(
    `the screen never rendered within ${timeoutMs} ms — last seen ${JSON.stringify(last)}`,
  );
}

/**
 * In-page navigation, deliberately: driver-level navigation is the operation that
 * lands on the wrong page, and it also throws away the document the audit was
 * injected into.
 *
 * The control is **waited for**, not looked up once. A screen whose text has stopped
 * growing is not a screen whose data has arrived: on the first smoke run the Game
 * table's rows were still loading when the walk asked for a row, and the same screen
 * that was "unreachable" in the light half opened fine in the dark one, purely on
 * cache warmth. A helper that reported that as unreachable would have manufactured
 * exactly the kind of false finding this library exists to stop.
 */
async function clickInPage(session, port, finder, what, { timeoutMs = 20000, settleMs = 180 } = {}) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const clicked = await session.evaluate(`(() => {
      ${guard(port)}
      const target = ${finder};
      if (!target) return false;
      target.click();
      return true;
    })()`);
    if (clicked) return;
    if (Date.now() >= until) {
      throw new Error(
        `nothing to click for ${what} after ${timeoutMs} ms: the app does not offer it in this state`,
      );
    }
    await new Promise((r) => setTimeout(r, settleMs));
  }
}

const NAV_LINK = (route) =>
  `[...document.querySelectorAll('nav[aria-label="main"] a')].find((a) => new URL(a.href).pathname === ${JSON.stringify(route)})`;

/* The Game row is a `button`, not a link. A driver hunting for an `href` matching
   `/analyse/` finds nothing and records the screen as unreachable — measured on the
   2026-08-19 run, and still the single most re-discovered fact about this app. */
const FIRST_GAME_BUTTON = `document.querySelector("table tbody tr button")`;
const FIRST_PROFILE_LINK = `document.querySelector('a[href*="/profiles/"]:not([href*="#"])')`;

const ANY_SCREEN = () => true;
const isExactly = (route) => (path) => path === route;
const looksLike = (pattern) => (path) => pattern.test(path);

/** Reach one screen of the inventory from wherever the walk currently stands. */
export async function reachScreen(session, { port, screen, waitOptions }) {
  if (screen.inNav) {
    await clickInPage(session, port, NAV_LINK(screen.route), screen.name, waitOptions);
    return waitForScreen(session, port, isExactly(screen.route), waitOptions);
  }
  if (screen.route.startsWith("/analyse/")) {
    await clickInPage(session, port, NAV_LINK("/"), "Mes parties", waitOptions);
    await waitForScreen(session, port, isExactly("/"), waitOptions);
    await clickInPage(session, port, FIRST_GAME_BUTTON, "a Game row", waitOptions);
    return waitForScreen(session, port, looksLike(/^\/analyse\/[^/]+$/), waitOptions);
  }
  if (screen.route.startsWith("/profiles/")) {
    await clickInPage(session, port, NAV_LINK("/profiles"), "Profils", waitOptions);
    await waitForScreen(session, port, isExactly("/profiles"), waitOptions);
    await clickInPage(session, port, FIRST_PROFILE_LINK, "a Profile row", waitOptions);
    return waitForScreen(session, port, looksLike(/^\/profiles\/[^/]+$/), waitOptions);
  }
  throw new Error(`theme-pass.md declares ${screen.route} out of the navigation without saying how to reach it`);
}

/**
 * Make a `Profile` current, by clicking it in the list the way a Player would.
 *
 * A fresh browser has no `Profile` selected, and the scoped screens redirect to the
 * list until one is — so without this the walk audits the same screen nine times and
 * reports eight of them unreachable. Slice 04 lifts this into the navigation helper;
 * it lives here because the pass cannot start without it.
 */
export async function selectProfile(session, { port, username, waitOptions }) {
  await clickInPage(session, port, NAV_LINK("/profiles"), "Profils", waitOptions);
  await waitForScreen(session, port, isExactly("/profiles"), waitOptions);
  const picked = await session.evaluate(`(() => {
    ${guard(port)}
    const row = [...document.querySelectorAll("tr, li")].find(
      (r) => r.textContent.includes(${JSON.stringify(username)}) && r.querySelector("button"),
    );
    if (!row) return null;
    const button = [...row.querySelectorAll("button")].find((b) => /s[ée]lectionner/i.test(b.textContent));
    if (!button) return "already";
    button.click();
    return "clicked";
  })()`);
  if (picked === null) throw new Error(`no Profile row named ${username} on this screen`);
  await waitForScreen(session, port, isExactly("/profiles"), waitOptions);
  return picked;
}

/**
 * The whole pass: every screen the document declares, in both themes.
 *
 * Returns raw readings — `theme-audit.js`'s own object, untouched — plus which screen
 * and which theme produced each. Nothing here is compared to anything expected: the
 * scenario reads these and judges them.
 *
 * A screen the scenario's state cannot reach is recorded as unreachable **with its
 * reason** rather than skipped, because a pass that quietly shrinks is the failure
 * this library exists to prevent.
 */
export async function runThemePass({
  session,
  baseUrl,
  port,
  screens = screensFromDoc(),
  profile,
  waitOptions,
}) {
  const source = themeAuditSource();
  const readings = [];

  for (const theme of THEMES) {
    /* The emulation is set on the session that stays alive, and it is set again for
       each half rather than assumed to have survived the previous one. */
    await emulateTheme(session, theme);
    await open(session, baseUrl);
    /* Where the app lands is the app's business — a scoped screen redirects to the
       Profile list until one is current. Wait for *a* rendered screen, then walk. */
    await waitForScreen(session, port, ANY_SCREEN, waitOptions);
    if (profile) await selectProfile(session, { port, username: profile, waitOptions });

    for (const screen of screens) {
      let reached = true;
      let unreachable = null;
      try {
        await reachScreen(session, { port, screen, waitOptions });
      } catch (e) {
        reached = false;
        unreachable = e.message;
      }
      if (!reached) {
        readings.push({ theme, screen: screen.name, route: screen.route, unreachable });
        continue;
      }
      const report = JSON.parse(await session.evaluate(auditScript({ port, theme, source })));
      readings.push({ theme, screen: screen.name, route: screen.route, report });
    }
  }
  return readings;
}
