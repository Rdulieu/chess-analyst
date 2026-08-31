/*
 * The app's life for the length of one scenario: restore, launch, stop (US-18,
 * ADR-0020).
 *
 * Host half. These are the most re-derived mechanics of the suite and the ones that
 * have cost the most runs — every rule below is here because somebody paid for it:
 *
 * - **Restore before starting.** A server creates its database when it opens it, so a
 *   copy laid down afterwards is overwritten by a live process.
 * - **`PRAGMA wal_checkpoint(TRUNCATE)`, then `.backup`, never `cp`, then read the
 *   copy back.** The database runs in WAL: a `.db` copied alone once gave a database
 *   with no table in it (4 KB of `.db` beside 95 KB of `-wal`), and a `cp` taken
 *   *after* a truncating checkpoint gave "database disk image is malformed" where
 *   `.backup` worked on the same source.
 * - **Stop the tree, not the pid you were handed.** `npx` interposes a wrapper, so the
 *   process listening is usually a **grandchild**; and a free port is no proof of a
 *   stopped app when a watcher survives to resurrect it on the next edit. Hence: no
 *   watcher at all for a run that validates a given commit.
 * - **Never kill what you cannot prove is yours.** `/proc/<pid>/environ` has lied in
 *   both directions. `cwd` and `cmdline` are the proofs that worked.
 *
 * It drives and it does not judge. It returns raw values — row counts, pids, ports —
 * and it **throws** when the mechanism failed. A copy that cannot be read back must go
 * red; it must never start an app on an empty database that would look like a clean
 * state.
 */

import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync, readlinkSync, realpathSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

/* --------------------------------------------------------------- the database */

/* stderr piped rather than inherited: every message this helper provokes is one it
   turns into a thrown Error, and a green run that prints errors teaches nobody to read
   them. */
const sqlite3 = (args, options = {}) =>
  execFileSync("sqlite3", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options }).trim();

/**
 * What a database actually holds: a row count per user table.
 *
 * This is the read-back, and it is the whole point. It opens the file, lists its
 * tables and counts each one, so a copy that is malformed, truncated or empty of
 * tables fails **here** rather than three steps later as a scenario reporting zero
 * Games.
 */
export function readBack(dbFile) {
  let names;
  try {
    names = sqlite3([dbFile, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"])
      .split("\n")
      .filter(Boolean);
  } catch (e) {
    throw new Error(`${dbFile} cannot be read back: ${String(e.stderr || e.message).trim()}`, { cause: e });
  }
  if (names.length === 0) throw new Error(`${dbFile} holds no table — that is what a bad copy looks like`);

  const counts = {};
  for (const name of names) {
    try {
      counts[name] = Number(sqlite3([dbFile, `SELECT count(*) FROM "${name}";`]));
    } catch (e) {
      throw new Error(`${dbFile} cannot be read back: table ${name} — ${String(e.stderr || e.message).trim()}`, { cause: e });
    }
  }
  return counts;
}

/**
 * Copy a database the way that has actually worked, and prove the copy before handing
 * it over. Returns what the copy holds; throws otherwise.
 *
 * The destination must not have a `-wal` beside it: that is a database some process is
 * still holding open, and overwriting it is how one run copied a database out from
 * under another.
 */
export function restoreSnapshot({ from, to }) {
  if (!existsSync(from)) throw new Error(`no snapshot at ${from}`);
  /* A `-wal` with frames in it means somebody is mid-write on the destination, and
     overwriting it is how one run copied a database out from under another. An empty
     one is only residue from a process that was killed — say what it is and go on,
     rather than accusing a process that is not there. */
  if (existsSync(`${to}-wal`) && statSync(`${to}-wal`).size > 0) {
    throw new Error(
      `${to}-wal holds ${statSync(`${to}-wal`).size} bytes of pending frames: something is writing to ${to} — stop it before restoring`,
    );
  }

  /*
   * **The source is never written to**, and that is a promise rather than a
   * precaution: every Feature Path copies the requester's live database, whose
   * `Evaluation`s only engine time can rebuild (ADR-0015).
   *
   * Until 2026-08-31 this ran `PRAGMA wal_checkpoint(TRUNCATE)` against the source
   * first. It never damaged anything, and it bought nothing: the backup API reads
   * **through** an unmerged WAL on its own — measured against a source holding
   * 4152 bytes of frames with its writer still connected, copy complete. What is
   * kept is the diagnostic the checkpoint used to provide: how much the source's
   * WAL was holding, observed rather than merged, because a source with pending
   * frames is a source something may still be writing to.
   *
   * `-readonly` on the connection is the guarantee, not the comment.
   */
  const walBytes = existsSync(`${from}-wal`) ? statSync(`${from}-wal`).size : 0;

  for (const stale of [to, `${to}-wal`, `${to}-shm`]) rmSync(stale, { force: true });
  try {
    sqlite3(["-readonly", from, `.backup '${to}'`]);
  } catch (e) {
    throw new Error(`.backup of ${from} failed: ${String(e.stderr || e.message).trim()}`, { cause: e });
  }

  return { file: to, tables: readBack(to), source: { walBytes } };
}

/* ------------------------------------------------------------------- the ports */

/** Every pid a listening port is held by, wrapper and grandchild alike. */
export function parsePortHolders(ssOutput) {
  const pids = [];
  for (const match of ssOutput.matchAll(/pid=(\d+)/g)) {
    const pid = Number(match[1]);
    if (!pids.includes(pid)) pids.push(pid);
  }
  return pids;
}

/** Who is listening on a port right now. An empty list means the port is free. */
export function holdersOf(port) {
  try {
    return parsePortHolders(execFileSync("ss", ["-lptnH", `sport = :${port}`], { encoding: "utf8" }));
  } catch {
    return [];
  }
}

/**
 * Whether a process is one of mine, and — always — why.
 *
 * **The tree is the proof; the port is not.** A process is mine when it runs under my
 * root, in its working directory or in its command line. Naming my port is
 * corroboration and never sufficient on its own: measured 2026-08-27, a
 * `python3 -m http.server 3222` started from `/tmp` by nobody in particular was
 * declared mine and killed, purely because "3222" appears in its arguments. A
 * substring of somebody else's command line is not evidence.
 *
 * The reason travels with the verdict because of how this fails, and the two
 * directions are not equal: a check that wrongly says "not mine" leaves my own orphan
 * for the next run to trip over, which costs a port to shift off; one that wrongly
 * says "mine" takes down a sibling agent's run. Neither is diagnosable from a bare
 * boolean.
 *
 * `environ` is accepted and deliberately never decisive: it has answered "not mine"
 * about a process that was, and carried nothing identifying at all on both a vite and
 * a Chrome pid.
 */
/**
 * The only three places this app is ever started from.
 *
 * The root is resolved first: `/proc/<pid>/cwd` is a resolved path, so a `repoRoot`
 * given through a symlink compares equal to nothing and the caller spares its own app.
 * That error goes the safe way — an orphan rather than a fratricide — and it is loud
 * (both processes land in `spared`, `portsFree` is false, the next launch throws), but
 * it is still one `realpathSync` away from not happening.
 */
export const ownDirectories = (root) => {
  let real = root;
  try {
    real = realpathSync(root);
  } catch {
    /* a root that does not exist compares equal to nothing, which is the safe way */
  }
  return [real, join(real, "server"), join(real, "client")];
};

export function namesMe({ cwd = "", cmdline = "" } = {}, { port, root, dirs } = {}) {
  const byPort = port !== undefined && cmdline.includes(String(port));
  /*
   * An **exact place**, not a prefix, and not something merely mentioned.
   *
   * Three shapes of the same mistake were killed off in turn, each measured: the port
   * appearing in a stranger's arguments; the root appearing in them; and finally
   * `cwd.startsWith(root)`, which adopts both a prefix neighbour (`US-18` and `US-18b`
   * are one keystroke apart, and this repository really does name worktrees that way)
   * and — the one that matters — **any worktree nested inside the root**. The worktrees
   * of this repository live under `<main>/.claude/worktrees/`, so an agent working from
   * the main checkout would have stopped a colleague's server believing it was its own.
   * A trailing slash does not fix that; only an exact directory does.
   *
   * `launchApp` starts the app from exactly three places, so those three are the proof.
   */
  const places = dirs || (root ? ownDirectories(root) : []);
  const byRoot = places.includes(cwd);
  if (byRoot) {
    return {
      mine: true,
      why: byPort
        ? `it runs from ${cwd}, which is one of my own directories, and its command line names port ${port}`
        : `it runs from ${cwd}, which is one of my own directories`,
    };
  }
  return {
    mine: false,
    why: byPort
      ? `its command line mentions port ${port}, but that is not a proof of ownership — it runs from ${cwd || "somewhere unreadable"}, which is not one of my own directories (${places.join(", ") || "none given"})`
      : `nothing about it names me: it runs from ${cwd || "somewhere unreadable"}, which is not one of my own directories (${places.join(", ") || "none given"})`,
  };
}

/** What `/proc` says about a pid, tolerating everything it refuses to say. */
export function describeProcess(pid) {
  const read = (what, f) => {
    try {
      return f();
    } catch {
      return "";
    }
  };
  return {
    pid,
    cwd: read("cwd", () => readlinkSync(`/proc/${pid}/cwd`)),
    cmdline: read("cmdline", () => readFileSync(`/proc/${pid}/cmdline`, "utf8").replace(/\0/g, " ").trim()),
    environ: read("environ", () => readFileSync(`/proc/${pid}/environ`, "utf8").replace(/\0/g, " ").trim()),
  };
}

/* ----------------------------------------------------------------- the servers */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wait until a port is both **listening** and **answering**.
 *
 * Both halves are needed and the first smoke run proved it: a `launchApp` that waited
 * only on the client returned in 1.3 s announcing the app was up, while nothing at all
 * was listening on the server port yet — the very first API call then failed on an
 * empty body. "The server answered" is the postcondition; a spawned process is not one.
 *
 * Any status counts, 404 included: what is being asserted is that something is
 * serving, never what it serves. That is the scenario's business.
 */
async function waitForPort(port, what, timeoutMs) {
  const until = Date.now() + timeoutMs;
  let last;
  while (Date.now() < until) {
    if (holdersOf(port).length) {
      try {
        await fetch(`http://localhost:${port}/`);
        return true;
      } catch (e) {
        last = e;
      }
    }
    await sleep(200);
  }
  throw new Error(
    `the ${what} never answered on ${port} within ${timeoutMs} ms${last ? ` (${last.message})` : ""}`,
  );
}

/**
 * Start the app on ports and a database of the caller's choosing.
 *
 * No project default is used, and that is enforced rather than documented: an agent
 * that forgets its ports must get an error, not somebody else's app on :3001.
 *
 * **No file watcher.** A run that validates a given commit must not have its server
 * replaced by a later edit — and killing a watcher's child leaves the watcher to
 * resurrect a server on a port verified free minutes earlier, which is how one run
 * ended up testing code nobody meant to test.
 */
export async function launchApp({ repoRoot, serverPort, clientPort, dbFile, timeoutMs = 60000 }) {
  for (const [name, value] of [["serverPort", serverPort], ["clientPort", clientPort], ["dbFile", dbFile]]) {
    if (!value) {
      throw new Error(`launchApp needs its own ${name}: the project's defaults belong to whoever is already running.`);
    }
  }
  for (const port of [serverPort, clientPort]) {
    const holders = holdersOf(port);
    if (holders.length) {
      throw new Error(`port ${port} is not free — held by ${holders.join(", ")}. Take another pair and say which.`);
    }
  }

  /*
   * Detached, and unref'd, on purpose. An agent drives in several shell calls — launch,
   * then navigate, then audit — and children tied to the launching script die with it:
   * measured 2026-08-27, a multi-phase pilot was killed at three minutes and took the
   * app with it, which makes launching in one call and driving in the next impossible.
   *
   * The cost is that a script which dies before `stopApp` leaves the app running. That
   * is recoverable and loud: the next `launchApp` throws naming the port, and `stopApp`
   * works from a plain `{ repoRoot, serverPort, clientPort }` — it finds what is
   * listening rather than trusting a pid it was handed.
   */
  const started = [];
  const start = (cwd, command, args, env) => {
    const child = spawn(command, args, {
      cwd: join(repoRoot, cwd),
      env: { ...process.env, ...env },
      stdio: ["ignore", "ignore", "ignore"],
      detached: true,
    });
    child.unref();
    started.push(child);
    return child;
  };

  start("server", "npx", ["tsx", "src/main.ts"], { PORT: String(serverPort), DB_FILE: dbFile });
  start("client", "npx", ["vite", "--port", String(clientPort), "--strictPort"], {
    API_TARGET: `http://localhost:${serverPort}`,
  });

  /* The server first: the client proxies to it, so a client that answers while the
     server is still starting hands the scenario an app that 502s on its first read. */
  await waitForPort(serverPort, "server", timeoutMs);
  await waitForPort(clientPort, "client", timeoutMs);

  return {
    repoRoot,
    serverPort,
    clientPort,
    dbFile,
    baseUrl: `http://localhost:${clientPort}/`,
    spawned: started.map((c) => c.pid),
  };
}

/**
 * Stop what this handle started, and prove the ports are free afterwards.
 *
 * Kills by pid, never by pattern: `pkill node` takes down every sibling agent's server
 * mid-run. Walks the port's holders because `npx` interposes a wrapper and the process
 * actually listening is usually a grandchild — killing the pid that was spawned leaves
 * the real server serving.
 *
 * A holder it cannot prove is its own is **left alone and reported**. That is the right
 * way round: the cost of sparing a stranger is a port to shift off, and the cost of
 * killing one is somebody else's run.
 */
export async function stopApp(handle, { timeoutMs = 15000 } = {}) {
  /* Without a root, nothing can be proved mine, so everything is spared and the call
     returns having stopped nothing — quietly, unless the caller reads `spared`. Since
     the recommended way to stop is now a handle rebuilt by hand in a later shell call,
     a forgotten field must be an error rather than a silent no-op. */
  if (!handle || !handle.repoRoot) {
    throw new Error("stopApp needs repoRoot: without it nothing can be proved mine, and it would spare everything");
  }
  const spared = [];
  const killed = [];

  for (const port of [handle.serverPort, handle.clientPort]) {
    for (const pid of holdersOf(port)) {
      const proof = namesMe(describeProcess(pid), { port, root: handle.repoRoot });
      if (!proof.mine) {
        spared.push({ pid, port, why: proof.why });
        continue;
      }
      try {
        process.kill(pid, "SIGTERM");
        killed.push({ pid, port, why: proof.why });
      } catch {
        /* already gone between the listing and the signal */
      }
    }
  }
  for (const pid of handle.spawned || []) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* the wrapper usually dies with its child */
    }
  }

  const until = Date.now() + timeoutMs;
  let stillHeld;
  do {
    await sleep(250);
    stillHeld = [handle.serverPort, handle.clientPort].flatMap((p) =>
      holdersOf(p).map((pid) => ({ port: p, pid })),
    );
  } while (stillHeld.length && Date.now() < until);

  const unexplained = stillHeld.filter((h) => !spared.some((s) => s.pid === h.pid));
  if (unexplained.length) {
    throw new Error(
      `still listening after stop: ${unexplained.map((h) => `${h.pid} on ${h.port}`).join(", ")} — a free port is the only proof a stop worked`,
    );
  }
  return { killed, spared, portsFree: stillHeld.length === 0 };
}
