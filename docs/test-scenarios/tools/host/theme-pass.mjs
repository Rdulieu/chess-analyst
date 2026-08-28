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

import { emulateTheme, open, setViewport } from "./cdp.mjs";
import { ANY_SCREEN, matcherFor, reachScreen, selectProfile, waitForScreen } from "./navigate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const THEME_PASS_DOC = join(HERE, "..", "..", "theme-pass.md");
export const THEME_AUDIT_SOURCE = join(HERE, "..", "page", "theme-audit.js");

export const THEMES = ["light", "dark"];

/**
 * The viewport height every width is audited at. It is not a variable of the pass:
 * what the two widths exist to see — a folded row, a contested reserved space, a page
 * pushed sideways — is decided by the inline axis alone.
 */
export const VIEWPORT_HEIGHT = 900;

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

/**
 * The widths `theme-pass.md` declares, read off its own table — the same rule as the
 * screens, and for the same reason. A width hard-coded here and a width named in the
 * prose is a second copy, and the last second copy cost the suite a whole run.
 *
 * Each row is `| \`<n> px\` | why this one |`.
 */
export function parseWidths(markdown) {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => /^#{2,}\s.*\bwidths\b/i.test(l.trim()));
  if (start === -1) {
    throw new Error("theme-pass.md declares no widths section: refusing to guess how wide the pass looks");
  }
  const end = lines.findIndex((l, i) => i > start && /^#{1,}\s/.test(l.trim()));

  const widths = lines
    .slice(start, end === -1 ? lines.length : end)
    .map((l) => l.trim())
    .map((l) => l.match(/^\|\s*`(\d+)\s*px`\s*\|/))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  if (widths.length === 0) {
    throw new Error("the widths section of theme-pass.md holds no width");
  }
  return widths;
}

/** The widths as the document currently declares them. */
export function widthsFromDoc() {
  return parseWidths(readFileSync(THEME_PASS_DOC, "utf8"));
}

/** How many audits a pass owes: every screen, in both themes, at every width. */
export function plannedAudits(screens, widths = widthsFromDoc()) {
  return screens.length * THEMES.length * widths.length;
}

/**
 * The whole walk, as a flat list, before anything is driven.
 *
 * Nesting it this way is a decision and not an accident. The **theme** is the outermost
 * loop because colour-scheme emulation is the mechanism that has silently misbehaved,
 * in both directions, across four runs: set it as rarely as possible and assert it as
 * often as possible. The **width** comes next so a walk of the nine screens happens
 * under one layout throughout — a viewport that changes mid-walk measures a page that
 * is still reflowing.
 *
 * It is a value, so the size and the shape of a pass can be read without a browser.
 */
export function passPlan({ screens = screensFromDoc(), themes = THEMES, widths = widthsFromDoc() } = {}) {
  const steps = [];
  for (const theme of themes) {
    for (const width of widths) {
      for (const screen of screens) steps.push({ theme, width, screen });
    }
  }
  return steps;
}

/* -------------------------------------------------------- the injected script */

/**
 * The expression evaluated on the page: the audit's own source, a guard on the port,
 * the theme assertion and — since US-22 — the width assertion.
 *
 * All three guards are load-bearing rather than defensive. The port guard is what kept
 * every action off a sibling agent's app when a shared browser stole the selected
 * page ~20 times in one parallel run. The theme assertion is what caught two runs
 * that audited the dark palette twice and would have reported a green light theme
 * that never rendered. The width assertion is the same guard on the same kind of
 * emulation: a viewport override is a thing the browser can quietly not apply, and a
 * narrow half that rendered wide would report a green narrow screen nobody saw.
 *
 * `width` is optional: a caller auditing one screen at whatever size the window
 * happens to be owes no claim about it, and a guard on a claim nobody made would only
 * be noise.
 */
export function auditScript({ port, theme, width, source }) {
  if (!THEMES.includes(theme)) {
    throw new Error(`Unknown theme ${JSON.stringify(theme)}: the pass runs ${THEMES.join(" and ")}.`);
  }
  const wanted = theme === "dark";
  const widthGuard =
    width === undefined
      ? ""
      : `
  if (innerWidth !== ${Number(width)}) {
    throw new Error("width guard: asked for ${Number(width)} px, the page measures " + innerWidth + " — the viewport override did not take");
  }`;
  return `(() => {
  if (location.port !== ${JSON.stringify(String(port))}) {
    throw new Error("port guard: this is " + location.port + ", not ${port} — refusing to act on another agent's app");
  }
  const measured = matchMedia("(prefers-color-scheme: dark)").matches;
  if (measured !== ${wanted}) {
    throw new Error("theme guard: asked for ${theme}, the page measures " + (measured ? "dark" : "light") + " — the emulation did not take");
  }${widthGuard}
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
  widths = widthsFromDoc(),
  profile,
  waitOptions,
  /* Per-route openers, for the screens the navigation cannot reach. A scenario whose
     assertions depend on *which* Game is opened must say so, or the pass will audit
     whichever row happens to be first (measured 2026-08-27: an unanalysed one, twice). */
  openers,
}) {
  const source = themeAuditSource();
  const readings = [];
  let entered = null;

  for (const { theme, width, screen } of passPlan({ screens, widths })) {
    const half = `${theme}|${width}`;
    if (half !== entered) {
      /* The emulation is set on the session that stays alive, and it is set again for
         each half rather than assumed to have survived the previous one. */
      await emulateTheme(session, theme);
      await setViewport(session, { width, height: VIEWPORT_HEIGHT });
      await open(session, baseUrl);
      /* Where the app lands is the app's business — a scoped screen redirects to the
         Profile list until one is current. Wait for *a* rendered screen, then walk. */
      await waitForScreen(session, port, ANY_SCREEN, waitOptions);
      if (profile) await selectProfile(session, { port, username: profile, waitOptions });
      entered = half;
    }

    let unreachable = null;
    try {
      await reachScreen(session, { port, screen, waitOptions, openers });
    } catch (e) {
      unreachable = e.message;
    }
    if (unreachable) {
      readings.push({ theme, width, screen: screen.name, route: screen.route, unreachable });
      continue;
    }
    const report = JSON.parse(await session.evaluate(auditScript({ port, theme, width, source })));
    readings.push({ theme, width, screen: screen.name, route: screen.route, report });
  }
  return readings;
}

/** Re-exported so a caller reaching one screen does not need two imports. */
export { matcherFor, reachScreen, selectProfile, waitForScreen };
