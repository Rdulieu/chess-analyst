/*
 * The theme pass, behind one call per screen (US-18, ADR-0020).
 *
 * Host half. The page half is `../page/theme-audit.js`, which is not rewritten here: it
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
import { ANY_SCREEN, matcherFor, reachScreen, selectProfile, waitForScreen } from "./navigate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const THEME_PASS_DOC = join(HERE, "..", "..", "theme-pass.md");
export const THEME_AUDIT_SOURCE = join(HERE, "..", "page", "theme-audit.js");

export const THEMES = ["light", "dark"];

/* ------------------------------------------------------------------ inventory */

/**
 * The screens `theme-pass.md` declares, read off its own table.
 *
 * Each row is `| n | Name (\`/route\`) | reached by … |`. A screen is *in the
 * navigation* when its "Reached by" cell starts with that word; the other two are
 * opened from a list, and forgetting them is how a pass silently shrinks. (Starts
 * with, not contains: screen 7's cell explains that it is "deliberately absent from
 * the navigation", and a looser test would read that as the opposite of what it says.)
 *
 * Only the screens section is read. The document is prose with tables in it and prose
 * grows: the known-open findings below it are numbered too, and a parse that swept the
 * whole file would quietly enrol them. An inventory that grows or shrinks on its own
 * is the single thing this function must never do.
 */
export function parseScreenInventory(markdown) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => /^#{2,}\s.*\bscreens\b/i.test(l.trim()));
  if (start === -1) {
    throw new Error("theme-pass.md declares no screens section: refusing to guess the inventory");
  }
  const end = lines.findIndex((l, i) => i > start && /^#{1,}\s/.test(l.trim()));

  const rows = lines
    .slice(start, end === -1 ? lines.length : end)
    .map((l) => l.trim())
    .filter((l) => /^\|\s*\d+\s*\|/.test(l));
  if (rows.length === 0) {
    throw new Error("the screens section of theme-pass.md holds no numbered rows");
  }

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

/*
 * Walking the screens is not the theme pass's own business: it is what every scenario
 * does, so it lives in `./navigate.mjs` (US-18 slice 04) and is used from here. This
 * file keeps what is about the *theme* — the two halves of the pass, the emulation,
 * and the assertion that the theme measured is the theme asked for.
 */

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
  /* Per-route openers, for the screens the navigation cannot reach. A scenario whose
     assertions depend on *which* Game is opened must say so, or the pass will audit
     whichever row happens to be first (measured 2026-08-27: an unanalysed one, twice). */
  openers,
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
      let unreachable = null;
      try {
        await reachScreen(session, { port, screen, waitOptions, openers });
      } catch (e) {
        unreachable = e.message;
      }
      if (unreachable) {
        readings.push({ theme, screen: screen.name, route: screen.route, unreachable });
        continue;
      }
      const report = JSON.parse(await session.evaluate(auditScript({ port, theme, source })));
      readings.push({ theme, screen: screen.name, route: screen.route, report });
    }
  }
  return readings;
}

/** Re-exported so a caller reaching one screen does not need two imports. */
export { matcherFor, reachScreen, selectProfile, waitForScreen };
