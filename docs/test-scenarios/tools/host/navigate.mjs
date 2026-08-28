/*
 * Navigating, and reading a field back (US-18, ADR-0020).
 *
 * Host half. The page half is `../page/app-driver.js`, injected as it stands; the two
 * halves do not import each other. What lives here is everything the page cannot do
 * for itself: guard every script with the port, wait until a screen has actually
 * rendered, and **throw** when a mechanism failed.
 *
 * It returns raw values — the path it reached, the value the field read back — and it
 * never says whether they are the right ones. That is the scenario's judgement.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PAGE_DRIVER = join(HERE, "..", "page", "app-driver.js");

/**
 * The page half's source, to inject as it stands.
 *
 * Read once. It is embedded in every evaluated expression, `waitForScreen`'s 180 ms
 * poll included, so re-reading it from disk each time is a syscall per poll for a file
 * that cannot change during a run.
 */
let cachedSource = null;
export function pageDriverSource() {
  if (cachedSource === null) cachedSource = readFileSync(PAGE_DRIVER, "utf8");
  return cachedSource;
}

/* ---------------------------------------------------------------- the guard */

/**
 * Wrap an expression so it refuses to run anywhere but on my own app.
 *
 * Load-bearing, not belt-and-braces: on one parallel run a shared browser stole the
 * selected page around twenty times, and this guard is the reason not one action
 * landed on a sibling agent's app. Every builder in this module goes through it, and a
 * missing port is an error rather than an unguarded script.
 *
 * **The body must `return` its value.** It is wrapped in an IIFE, so an
 * expression-shaped body evaluates to `undefined` and the caller's `JSON.parse` then
 * fails with `"undefined" is not valid JSON` — an error that names nothing useful,
 * and cost one run on 2026-08-28.
 */
export function guarded(port, body) {
  if (!port) throw new Error("every injected script needs the port it belongs to: refusing to build an unguarded one");
  return `(() => {
  if (location.port !== ${JSON.stringify(String(port))}) {
    throw new Error("port guard: this is " + location.port + ", not ${port} — refusing to act on another agent's app");
  }
  ${body}
})()`;
}

/** An expression that injects the page half and calls one of its functions. */
export function driverCall(port, call) {
  return guarded(port, `${pageDriverSource()}\n  return JSON.stringify(agenticDriver.${call});`);
}

/* ------------------------------------------------------------ reading back */

/**
 * Put a value into a field and prove it took, **before** anything is submitted.
 *
 * The read-back is the whole point. The import form's month fields keep their default
 * when a driver assigns `value` or uses a high-level fill helper — measured
 * 2026-08-19, where the range silently stayed on the current month while the
 * checkboxes took, and the run would have imported the wrong months for a reason that
 * has nothing to do with the app. A helper that filled and moved on would reproduce
 * that finding on every future run.
 */
export function setFieldScript({ port, selector, value }) {
  return guarded(
    port,
    `${pageDriverSource()}
  const outcome = agenticDriver.setField(${JSON.stringify(selector)}, ${JSON.stringify(value)});
  if (outcome.missing) throw new Error("no field matching " + outcome.missing + " on this screen");
  if (outcome.read !== ${JSON.stringify(value)}) {
    throw new Error(
      "the field " + ${JSON.stringify(selector)} + " reads back " + JSON.stringify(outcome.read) +
      " after being set to " + ${JSON.stringify(JSON.stringify(value))} +
      " — the value did not take. Nothing has been submitted, and the field has been put back to " +
      JSON.stringify(outcome.restored)
    );
  }
  return JSON.stringify(outcome);`,
  );
}

/** Set a field and hand back what it reads. Throws if it did not take. */
export async function setField(session, { port, selector, value }) {
  return JSON.parse(await session.evaluate(setFieldScript({ port, selector, value })));
}

/* ------------------------------------------------------------- the screens */

/**
 * A predicate for one route of the inventory, template parameters included.
 *
 * Exact, never a prefix: `/profiles` and `/profiles/:id` are two different screens of
 * the pass, and a predicate that matched both would report one of them twice.
 */
export function matcherFor(route) {
  const pattern = new RegExp(`^${route.replace(/:[^/]+/g, "[^/]+").replace(/\//g, "\\/")}$`);
  return (path) => pattern.test(path);
}

/**
 * Wait until a screen has actually rendered, which takes **two** conditions.
 *
 * Text stability alone is satisfied instantly by a loading placeholder: measured
 * 2026-08-27, `/confrontation` was audited at ~300 ms while its content landed at
 * ~600, reporting thirteen text nodes out of seventy and calling itself a pass. So the
 * app must have **stopped fetching** as well. There is no soft fallback for a session
 * that cannot report requests in flight — that would be the way back to the defect.
 */
export async function waitForScreen(session, port, matches, { timeoutMs = 20000, settleMs = 180 } = {}) {
  if (typeof session.pendingRequests !== "function") {
    throw new Error(
      "this session cannot report requests in flight, so it cannot tell a rendered screen from a loading one — attach with cdp.mjs",
    );
  }
  const until = Date.now() + timeoutMs;
  let previous = null;
  let last = null;
  while (Date.now() < until) {
    const quiet = session.pendingRequests() === 0;
    const state = JSON.parse(await session.evaluate(driverCall(port, "where()")));
    last = { ...state, quiet };
    if (matches(state.path) && state.text > 0 && quiet && previous && previous.text === state.text) {
      return state;
    }
    previous = matches(state.path) && quiet ? state : null;
    await new Promise((r) => setTimeout(r, settleMs));
  }
  throw new Error(`the screen never rendered within ${timeoutMs} ms — last seen ${JSON.stringify(last)}`);
}

const ANY_SCREEN = () => true;
export { ANY_SCREEN };

/**
 * Do something in the page, waiting for the control to appear first.
 *
 * The control is waited for, not looked up once: a screen whose text has stopped
 * growing is not a screen whose data has arrived, and the same Game row was
 * "unreachable" in one theme and fine in the other purely on cache warmth.
 */
async function act(session, port, call, what, { timeoutMs = 20000, settleMs = 180 } = {}) {
  const until = Date.now() + timeoutMs;
  for (;;) {
    const done = JSON.parse(await session.evaluate(driverCall(port, call)));
    if (done !== false && done !== null) return done;
    if (Date.now() >= until) {
      throw new Error(`nothing to click for ${what} after ${timeoutMs} ms: the app does not offer it in this state`);
    }
    await new Promise((r) => setTimeout(r, settleMs));
  }
}

/** Follow a navigation entry, in the page, and wait for the screen it leads to. */
export async function followNav(session, { port, route, waitOptions }) {
  await act(session, port, `followNav(${JSON.stringify(route)})`, route, waitOptions);
  return waitForScreen(session, port, matcherFor(route), waitOptions);
}

/** Make a `Profile` current. A fresh browser has none, and the scoped screens redirect. */
export async function selectProfile(session, { port, username, waitOptions }) {
  await followNav(session, { port, route: "/profiles", waitOptions });
  let picked;
  try {
    picked = await act(session, port, `selectProfile(${JSON.stringify(username)})`, `the Profile ${username}`, waitOptions);
  } catch (cause) {
    /* The retry is right — rows arrive asynchronously — but a timeout that only says
       "nothing to click" cannot tell a slow list from a name that is not there. Say
       what the screen was offering when the wait ran out, and the reader knows which
       of the two it is. Before the walk was extracted this failed at once and named
       the Profile; the retry must not cost that. */
    const offered = JSON.parse(await session.evaluate(driverCall(port, "profilesOffered()")));
    throw new Error(
      `no Profile named ${JSON.stringify(username)} to select — this screen offers ${
        offered.length ? offered.map((o) => JSON.stringify(o)).join(", ") : "no Profile at all"
      }`,
      { cause },
    );
  }
  await waitForScreen(session, port, matcherFor("/profiles"), waitOptions);
  return picked;
}

/**
 * The opener a caller supplied for this screen, if any.
 *
 * The library must not choose **which** Game or **which** Profile a pass opens: that is
 * a judgement about the state, and it belongs to the scenario. It chose for two
 * scenarios on 2026-08-27 — always the first row — and both had an **unanalysed** Game
 * there, so the theme pass audited an `Analyse` screen with no evaluation curve, no
 * advantage bar and no severity glyph. It reported green and it was green, on the wrong
 * Game: a thinner green, the one failure mode ADR-0020 forbids.
 *
 * Both agents caught it and audited the right Game by hand, so nothing was lost that
 * run. The library as it stood would have lost it every run after.
 */
export function openerFor(openers, screen) {
  return openers && openers[screen.route];
}

/** The Game rows the list currently offers, raw, for a caller that needs to choose. */
export async function gameRows(session, { port }) {
  return JSON.parse(await session.evaluate(driverCall(port, "gameRows()")));
}

/** Open one Game of the list by its row index. The caller is already on the list. */
export async function openGameRow(session, { port, index, waitOptions }) {
  return act(session, port, `openGameRow(${Number(index)})`, `Game row ${index}`, waitOptions);
}

/**
 * Reach one screen of the inventory from wherever the walk currently stands.
 *
 * The two screens the navigation cannot reach are opened from their lists — and the
 * Game row is a `button`, which is the single most re-discovered fact about this app.
 * Which row, though, is the caller's call: pass `openers` when the assertions depend
 * on it.
 */
export async function reachScreen(session, { port, screen, waitOptions, openers }) {
  if (screen.inNav) return followNav(session, { port, route: screen.route, waitOptions });

  /*
   * The library keeps what it knows — **where the list is** — and hands over only the
   * choice of row. An opener called from wherever the walk happened to stand would
   * click into the wrong screen; an opener that had to navigate for itself would be
   * re-deriving what the library already has.
   */
  const from = screen.route.startsWith("/analyse/")
    ? { list: "/", fallback: "openFirstGame()", what: "a Game row" }
    : screen.route.startsWith("/profiles/")
      ? { list: "/profiles", fallback: "openFirstProfile()", what: "a Profile row" }
      : null;
  if (!from) {
    throw new Error(`the inventory declares ${screen.route} out of the navigation without saying how to reach it`);
  }

  await followNav(session, { port, route: from.list, waitOptions });
  const chosen = openerFor(openers, screen);
  if (chosen) await chosen(session, { port, screen, waitOptions });
  else await act(session, port, from.fallback, from.what, waitOptions);
  return waitForScreen(session, port, matcherFor(screen.route), waitOptions);
}
