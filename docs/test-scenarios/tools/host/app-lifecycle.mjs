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
import { existsSync, readFileSync, readlinkSync, rmSync } from "node:fs";
import { join } from "node:path";

/* --------------------------------------------------------------- the database */

const sqlite3 = (args, options = {}) =>
  execFileSync("sqlite3", args, { encoding: "utf8", ...options }).trim();

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
  if (existsSync(`${to}-wal`)) {
    throw new Error(`${to}-wal exists: a live process may be holding ${to} open — stop it before restoring`);
  }

  try {
    sqlite3([from, "PRAGMA wal_checkpoint(TRUNCATE);"]);
  } catch (e) {
    throw new Error(`cannot checkpoint ${from}: ${String(e.stderr || e.message).trim()}`, { cause: e });
  }

  for (const stale of [to, `${to}-wal`, `${to}-shm`]) rmSync(stale, { force: true });
  try {
    sqlite3([from, `.backup '${to}'`]);
  } catch (e) {
    throw new Error(`.backup of ${from} failed: ${String(e.stderr || e.message).trim()}`, { cause: e });
  }

  return { file: to, tables: readBack(to) };
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
 * The reason travels with the verdict because of how this fails: a check that wrongly
 * says "not mine" leaves my own orphan behind for the next run to trip over, and a
 * check that wrongly says "mine" kills a sibling agent's server mid-run. Neither can
 * be diagnosed from a bare boolean.
 *
 * `environ` is accepted and deliberately never decisive: it has answered "not mine"
 * about a process that was, and has carried nothing identifying at all on both a vite
 * and a Chrome pid.
 */
export function namesMe({ cwd = "", cmdline = "" } = {}, { port, root } = {}) {
  const byPort = port !== undefined && cmdline.includes(String(port));
  const byRoot = Boolean(root) && (cwd.startsWith(root) || cmdline.includes(root));
  if (byPort && byRoot) return { mine: true, why: `its command line names port ${port} and it runs under ${root}` };
  if (byPort) return { mine: true, why: `its command line names port ${port}` };
  if (byRoot) return { mine: true, why: `it runs under ${root}` };
  return {
    mine: false,
    why: `neither its working directory (${cwd || "unknown"}) nor its command line names ${
      [port !== undefined ? `port ${port}` : null, root].filter(Boolean).join(" or ") || "me"
    } — nothing here proves it is mine`,
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

  const started = [];
  const start = (cwd, command, args, env) => {
    const child = spawn(command, args, {
      cwd: join(repoRoot, cwd),
      env: { ...process.env, ...env },
      stdio: ["ignore", "ignore", "ignore"],
      detached: false,
    });
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
