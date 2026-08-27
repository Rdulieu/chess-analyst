/*
 * A private browser, and one session kept alive (US-18, ADR-0020).
 *
 * Host half. Zero dependencies: node 22 ships a global `WebSocket`, so the Chrome
 * DevTools Protocol can be spoken directly and the library stays installable by
 * being checked out. That matters — `puppeteer-core` was never a dependency of this
 * repository; every run so far installed it into a scratch directory of its own.
 *
 * Two things here are not conveniences:
 *
 * - **A private browser is the default, not the fallback.** On the parallel fan-out
 *   of 2026-08-23 the shared devtools browser stole the selected page from all three
 *   scenarios — one early snapshot returned a sibling's entire accessibility tree.
 *   Own the browser, own its `--user-data-dir`, own its debugging port.
 * - **One session, alive for the whole pass.** Colour-scheme emulation sent over a
 *   session that is then detached has silently reverted (2026-08-24, two agents), and
 *   on another run it survived a detach instead. Four observations disagree about the
 *   mechanism; none disagrees about the remedy.
 *
 * It drives and it does not judge: it returns what the page returned, and it throws
 * when the mechanism failed — the browser never answered, the screen never rendered,
 * the evaluated script raised.
 */

import { spawn, execFileSync } from "node:child_process";
import { readdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { holdersOf } from "./app-lifecycle.mjs";

/** `--no-sandbox` is required on this host: the bundled Chrome aborts without it. */
const CHROME_FLAGS = [
  "--no-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
];

/** The newest Chrome puppeteer has already downloaded on this machine. */
export function findChrome(home = process.env.HOME) {
  const root = join(home, ".cache", "puppeteer", "chrome");
  const builds = readdirSync(root).sort();
  if (builds.length === 0) throw new Error(`No Chrome under ${root}.`);
  return join(root, builds[builds.length - 1], "chrome-linux64", "chrome");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForJson(url, deadlineMs) {
  const until = Date.now() + deadlineMs;
  let last;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch (e) {
      last = e;
    }
    await sleep(100);
  }
  throw new Error(`${url} never answered within ${deadlineMs} ms${last ? ` (${last.message})` : ""}`);
}

/**
 * Launch a Chrome of one's own and attach to its single page.
 *
 * Returns the page session plus a `stop()` that kills the browser and waits for it —
 * a helper that leaves a browser behind makes the next run's port check lie.
 */
export async function launchBrowser({ cdpPort, userDataDir, chrome = findChrome(), headless = true } = {}) {
  if (!cdpPort) throw new Error("launchBrowser needs its own cdpPort: a shared browser steals pages.");
  /*
   * Refuse a debugging port somebody is already on. Measured 2026-08-27: a second
   * launch against a busy port did **not** fail — Chrome could not bind, and
   * `/json/list` was answered by the FIRST browser, so the caller was handed a page
   * belonging to another agent. That is the page theft this library exists to prevent,
   * arriving through the front door.
   */
  const onIt = holdersOf(cdpPort);
  if (onIt.length) {
    throw new Error(
      `CDP port ${cdpPort} is already held by ${onIt.join(", ")} — attaching would drive somebody else's browser. Take another port and say which.`,
    );
  }
  const profile = userDataDir || mkdtempSync(join(tmpdir(), "agentic-chrome-"));

  const child = spawn(
    chrome,
    [
      ...CHROME_FLAGS,
      ...(headless ? ["--headless=new"] : []),
      `--remote-debugging-port=${cdpPort}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let stderr = "";
  child.stderr.on("data", (b) => {
    stderr += b.toString();
  });
  /*
   * A browser that dies on its own is **recorded**, never thrown from here. Throwing
   * inside an event listener is an `uncaughtException`: it kills the whole script, and
   * since this slice made the app's children detached, the scenario then dies *before*
   * `stopApp` and leaves an app orphaned on two ports. This was the last place where
   * housekeeping could still fail a teardown; the crash surfaces on the next call
   * instead, where it can be reported and where `stop()` still runs.
   */
  const crash = { seen: null };
  child.on("exit", (code) => {
    if (code !== null && code !== 0 && !child.stopping) {
      crash.seen = `Chrome exited on its own with ${code}: ${stderr.slice(-400)}`;
    }
  });

  /* A launch that fails must not leave fourteen Chrome processes and a profile behind —
     measured 2026-08-27 on a CDP port that was already taken. Cleanup existed only on
     the success path, which is the path that needs it least. */
  let page;
  try {
    const targets = await waitForJson(`http://127.0.0.1:${cdpPort}/json/list`, 20000);
    page = targets.find((t) => t.type === "page");
    if (!page) throw new Error(`Chrome on ${cdpPort} exposes no page target.`);
  } catch (e) {
    child.stopping = true;
    child.kill("SIGKILL");
    if (!userDataDir) await removeProfile(profile);
    throw e;
  }

  const session = await attach(page.webSocketDebuggerUrl, crash);
  session.stop = stopper(child, profile, session, !userDataDir);
  Object.defineProperty(session, "browserCrash", { get: () => crash.seen });
  session.profile = profile;
  return session;
}

/** Is anything still running out of this profile? Chrome's children outlive its main process. */
function stillUsing(profile) {
  try {
    return execFileSync("pgrep", ["-f", profile], { encoding: "utf8" }).trim().length > 0;
  } catch {
    return false; // pgrep exits non-zero when it matches nothing
  }
}

/**
 * Remove the temporary profile, patiently, and never let it fail a teardown.
 *
 * It is Chrome's **children** that hold the directory: the main process exits in tens
 * of milliseconds while a zygote or a crashpad handler is still writing into
 * `Default/`. Measured 2026-08-27 — a straight `rmSync` threw `ENOTEMPTY` six times in
 * twelve, and four profiles survived even once the throw was swallowed. So wait for
 * the descendants to go, then remove; and report the outcome rather than raising it.
 */
async function removeProfile(profile, { timeoutMs = 4000 } = {}) {
  const until = Date.now() + timeoutMs;
  while (stillUsing(profile) && Date.now() < until) {
    await new Promise((r) => setTimeout(r, 100));
  }
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Tear the browser down, once, and never fail on housekeeping.
 *
 * Two rules, both learnt the hard way on 2026-08-27:
 *
 * - **Removing the temporary profile must never fail a teardown.** `rmSync(…, { force })`
 *   only swallows `ENOENT`, and Chrome keeps writing into `Default/` after its main
 *   process has exited: the removal threw `ENOTEMPTY` **six times in twelve** — failing
 *   the stop *and* leaving the profile behind. Worse than the litter: in a scenario
 *   `session.stop()` runs before `stopApp`, so a throw here aborts the teardown, and
 *   since the app's children are detached it survives as an orphan on two ports. So:
 *   retry, then give up quietly and say so in the result.
 * - **Stopping twice must be safe.** `child.kill()` on a dead process is a no-op and
 *   `once("exit")` then never fires, so the obvious `finally { await stop() }` hung
 *   forever. A teardown that cannot be called twice is a teardown nobody can write a
 *   `finally` around.
 */
function stopper(child, profile, session, ours) {
  let done = null;
  return () => {
    if (done) return done;
    done = (async () => {
      child.stopping = true;
      await session.close();
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
        await new Promise((resolve) => {
          if (child.exitCode !== null || child.signalCode !== null) return resolve();
          child.once("exit", resolve);
          setTimeout(resolve, 5000).unref();
        });
      }
      return { profile, profileRemoved: ours ? await removeProfile(profile) : false };
    })();
    return done;
  };
}

/** One live websocket to one page target, and it stays open for the whole pass. */
export async function attach(wsUrl, crash = { seen: null }) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  const listeners = new Map();
  let nextId = 1;

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error(`Cannot attach to ${wsUrl}`)), { once: true });
  });

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message} (CDP ${msg.error.code})`));
      else resolve(msg.result);
      return;
    }
    for (const fn of listeners.get(msg.method) || []) fn(msg.params);
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const on = (method, fn) => {
    if (!listeners.has(method)) listeners.set(method, []);
    listeners.get(method).push(fn);
    return () => {
      listeners.set(method, listeners.get(method).filter((f) => f !== fn));
    };
  };

  const once = (method, timeoutMs = 30000) =>
    new Promise((resolve, reject) => {
      const off = on(method, (params) => {
        off();
        clearTimeout(timer);
        resolve(params);
      });
      const timer = setTimeout(() => {
        off();
        reject(new Error(`${method} never fired within ${timeoutMs} ms`));
      }, timeoutMs);
    });

  const close = () =>
    new Promise((resolve) => {
      ws.addEventListener("close", resolve, { once: true });
      ws.close();
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  /*
   * What the network is doing, which is the half of "the screen has rendered" that
   * the DOM cannot answer. A screen showing a stable loading placeholder looks
   * settled to anything watching text alone — measured 2026-08-27 on `/confrontation`,
   * where the placeholder held steady for 400 ms and the real content arrived at
   * 600: an audit taken in that hole reported thirteen text nodes out of seventy and
   * still called itself a pass.
   */
  const inflight = new Map();
  on("Network.requestWillBeSent", ({ requestId }) => inflight.set(requestId, Date.now()));
  const settled = ({ requestId }) => inflight.delete(requestId);
  on("Network.loadingFinished", settled);
  on("Network.loadingFailed", settled);

  /**
   * Evaluate an expression and return its value. A raised exception on the page
   * becomes a thrown error here, carrying the page's own message: a helper that
   * swallowed it would hand back `undefined` and read as an empty measurement.
   */
  const evaluate = async (expression, { timeoutMs = 30000 } = {}) => {
    /* Say the browser died rather than letting a dead socket produce a riddle. */
    if (crash.seen) throw new Error(crash.seen);
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      timeout: timeoutMs,
    });
    if (exceptionDetails) {
      const thrown = exceptionDetails.exception;
      throw new Error(`page: ${(thrown && (thrown.description || thrown.value)) || exceptionDetails.text}`);
    }
    return result.value;
  };

  /**
   * How many requests are still out, ignoring any that has been out longer than
   * `staleMs`. A stream or a long poll never finishes and must not hold a walk
   * hostage; a fetch a screen is waiting on comes back in well under a second.
   *
   * Five seconds against this app's slowest screen content, which lands at 1.25 s —
   * a margin of about four (measured 2026-08-27). Two consequences worth knowing
   * rather than rediscovering: a legitimate fetch **slower** than this would be
   * ignored and would reopen the hole on that screen; and a screen that opens a
   * persistent stream costs the walk a flat five seconds, so a pass would slow from
   * 15 s to about 105 rather than lie about what it measured.
   */
  const pendingRequests = (staleMs = 5000) => {
    const now = Date.now();
    return [...inflight.values()].filter((started) => now - started < staleMs).length;
  };

  return { send, on, once, close, evaluate, pendingRequests };
}

/**
 * Navigate to a URL and wait for the document to load. Driver-level navigation is
 * used once, to enter the app; inside it, prefer in-page navigation — driver-level
 * navigation is the operation that lands on the wrong page.
 */
export async function open(session, url, { timeoutMs = 30000 } = {}) {
  const loaded = session.once("Page.loadEventFired", timeoutMs);
  await session.send("Page.navigate", { url });
  await loaded;
}

/** Pin the viewport, so a measurement is not taken at whatever size Chrome chose. */
export async function setViewport(session, { width, height, deviceScaleFactor = 1 }) {
  await session.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor,
    mobile: false,
  });
}

/**
 * Emulate `prefers-color-scheme`. Set on the session that stays alive — never on a
 * session about to be closed, which is one of the two ways this has silently
 * reverted. Setting it is not believing it: the audited script asserts what it
 * measures (see `theme-pass.mjs`).
 */
export async function emulateTheme(session, theme) {
  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-color-scheme", value: theme }],
  });
}
