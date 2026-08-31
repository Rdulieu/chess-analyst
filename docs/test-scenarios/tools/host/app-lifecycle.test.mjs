import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, statSync, readFileSync, existsSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { restoreSnapshot, readBack, parsePortHolders, namesMe } from "./app-lifecycle.mjs";

/*
 * Real SQLite, real files. The one thing that must not be faked here is the database:
 * every rule this module encodes was learnt from a copy that looked fine and was not.
 * On 2026-08-24 a `cp` taken *after* a truncating checkpoint gave a database whose
 * `evaluations` table read back as "database disk image is malformed"; earlier, a
 * `.db` copied alone gave 4 KB of file beside 95 KB of `-wal` and a database with no
 * table in it. A mocked filesystem would have proved neither.
 */
let work;
let holders = [];
const sqlite = (file, sql) => execFileSync("sqlite3", [file, sql], { encoding: "utf8" }).trim();

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), "app-lifecycle-"));
  holders = [];
});
afterEach(() => {
  for (const h of holders) h.kill("SIGKILL");
  rmSync(work, { recursive: true, force: true });
});

/**
 * A database the way a *running* app leaves it: hot, with an unmerged `-wal` beside it.
 *
 * The connection has to stay open, and that is not test scaffolding — it is the real
 * situation. SQLite merges and deletes the `-wal` when the last connection closes, so a
 * fixture that opens and closes `sqlite3` produces a tidy file and proves nothing about
 * the trap. Path 0 copies a database an app is holding.
 */
async function walHotDatabase(name = "source.db") {
  const file = join(work, name);
  const holder = spawn("sqlite3", [file], { stdio: ["pipe", "ignore", "ignore"] });
  holder.stdin.write(
    "PRAGMA journal_mode=WAL;\nPRAGMA wal_autocheckpoint=0;\n" +
      "CREATE TABLE games (id INTEGER PRIMARY KEY, pgn TEXT);\n" +
      "CREATE TABLE evaluations (id INTEGER PRIMARY KEY, cp INTEGER);\n" +
      "INSERT INTO games (pgn) VALUES ('1. e4'),('1. d4'),('1. c4');\n" +
      "INSERT INTO evaluations (cp) VALUES (12),(-30);\n" +
      "SELECT 1;\n",
  );
  /*
   * Wait for the LAST write, not for the first frame. `-wal` becomes non-empty as soon
   * as `CREATE TABLE games` lands, which is three statements before the fixture is
   * built — and a copy taken in that window holds an empty `games` and no
   * `evaluations` at all. It failed ~5 % of the time under load and never at rest, so
   * it read as a flake rather than as the race it is. A gate that goes red one run in
   * twenty gets re-run until it is green, which is the habit this whole story exists
   * to remove.
   */
  const ready = () => {
    try {
      // stderr piped, not inherited: until the table exists the probe prints
      // "no such table", and a green run that writes errors teaches nobody to read them.
      return (
        execFileSync("sqlite3", [file, "SELECT count(*) FROM evaluations;"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        }).trim() === "2"
      );
    } catch {
      return false;
    }
  };
  for (let i = 0; i < 200 && !ready(); i += 1) await new Promise((r) => setTimeout(r, 20));
  if (!ready()) throw new Error("the WAL-hot fixture never finished writing");
  if (!(existsSync(`${file}-wal`) && statSync(`${file}-wal`).size > 0)) {
    throw new Error("the WAL-hot fixture produced no -wal: it would prove nothing");
  }
  holders.push(holder);
  return file;
}

describe("restoring a snapshot", () => {
  it("carries what the source held, WAL included — the copy is read back before it is trusted", async () => {
    const from = await walHotDatabase();
    expect(statSync(`${from}-wal`).size).toBeGreaterThan(0); // the trap is real in this fixture

    const to = join(work, "restored.db");
    const restored = restoreSnapshot({ from, to });

    expect(restored.tables.games).toBe(3);
    expect(restored.tables.evaluations).toBe(2);
    expect(sqlite(to, "SELECT count(*) FROM games;")).toBe("3");
  });

  it("does not write to the source — it is the one file ADR-0015 exists to protect", async () => {
    /*
     * Every Feature Path copies the requester's live database, which holds
     * `Evaluation`s only engine time can rebuild. Until 2026-08-31 the restore ran
     * `PRAGMA wal_checkpoint(TRUNCATE)` against the SOURCE before backing it up —
     * harmless in practice on every run so far, and still a write path onto the one
     * file the project promises never to touch. It buys nothing: the backup API reads
     * through an unmerged WAL on its own, which this fixture proves next door.
     */
    const from = await walHotDatabase("untouched.db");
    const before = {
      db: statSync(from).mtimeMs,
      wal: statSync(`${from}-wal`).size,
      shm: existsSync(`${from}-shm`) ? statSync(`${from}-shm`).mtimeMs : null,
    };

    const restored = restoreSnapshot({ from, to: join(work, "from-untouched.db") });
    expect(restored.tables.games).toBe(3); // the copy is complete all the same

    expect(statSync(from).mtimeMs).toBe(before.db);
    expect(statSync(`${from}-wal`).size).toBe(before.wal);
    if (before.shm !== null) expect(statSync(`${from}-shm`).mtimeMs).toBe(before.shm);
  });

  it("reports what the source's WAL held, instead of merging it away", async () => {
    // The figure kept its diagnostic value: a source with pending frames is a source
    // something may still be writing to, and the caller is told rather than tidied up.
    const from = await walHotDatabase("reported.db");
    const restored = restoreSnapshot({ from, to: join(work, "from-reported.db") });

    expect(restored.source.walBytes).toBe(statSync(`${from}-wal`).size);
    expect(restored.source.walBytes).toBeGreaterThan(0);
  });

  it("throws on a corrupt copy instead of letting the app start on it", () => {
    const to = join(work, "corrupt.db");
    const from = join(work, "not-a-database.db");
    // Escaped, never a literal NUL: one raw NUL byte makes git treat the whole test
    // file as binary, and the diff of a slice about guarded code stops being reviewable.
    writeFileSync(from, "SQLite format 3\u0000 and then nothing that parses at all");

    expect(() => restoreSnapshot({ from, to })).toThrow(/read back|malformed|not a database/i);
  });

  it("throws when the source holds no table, which is what a bad copy looks like", () => {
    const from = join(work, "empty.db");
    sqlite(from, "PRAGMA user_version=1;");
    const to = join(work, "restored.db");

    expect(() => restoreSnapshot({ from, to })).toThrow(/no table/i);
  });

  it("refuses to overwrite a database a live process may be holding open", async () => {
    const from = await walHotDatabase();
    const to = join(work, "occupied.db");
    sqlite(to, "CREATE TABLE t (x);");
    writeFileSync(`${to}-wal`, "pretend a live server is writing here");

    expect(() => restoreSnapshot({ from, to })).toThrow(/-wal|live|running/i);
  });

  it("says what it found when asked to read back a database directly", async () => {
    const from = await walHotDatabase();
    expect(readBack(from)).toEqual({ games: 3, evaluations: 2 });
  });
});

describe("reading who holds a port", () => {
  /* Real `ss -lptn` output, copied from this host. */
  const SS_OUTPUT = `State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process
LISTEN 0      511          0.0.0.0:5199      0.0.0.0:*    users:(("node",pid=589693,fd=22))
LISTEN 0      511                *:3199            *:*    users:(("node",pid=589714,fd=23),("npm exec tsx",pid=589652,fd=23))
`;

  it("finds every pid a port is held by, wrapper included", () => {
    expect(parsePortHolders(SS_OUTPUT)).toEqual([589693, 589714, 589652]);
  });

  it("reads an empty listing as a free port, not as an error", () => {
    expect(parsePortHolders("State Recv-Q Send-Q Local Address:Port Peer Address:Port Process\n")).toEqual([]);
  });
});

describe("proving a process is mine before killing it", () => {
  /*
   * `/proc/<pid>/environ` has lied in BOTH directions — it answered "not mine" about a
   * process that was (2026-08-24), and carried nothing identifying at all on a vite and
   * a Chrome pid (2026-08-23). `cwd` and `cmdline` are the proofs that worked. Note
   * which way this must fail: a check that wrongly says "not mine" leaves an orphan for
   * the next run to trip over, so the reason is always reported.
   */
  const mine = {
    cwd: "/home/x/.claude/worktrees/US-18/client",
    cmdline: "node /home/x/.claude/worktrees/US-18/node_modules/vite/bin/vite.js --port 5211 --strictPort",
  };

  it("accepts a process that runs under my tree — which is the proof that works", () => {
    expect(namesMe(mine, { port: 5211, root: "/home/x/.claude/worktrees/US-18" }).mine).toBe(true);
    expect(namesMe({ cwd: mine.cwd, cmdline: "node something-else" }, { root: "/home/x/.claude/worktrees/US-18" }).mine).toBe(true);
  });

  it("refuses a stranger that merely mentions my port — the port is not a proof of ownership", () => {
    /*
     * Measured 2026-08-27: `python3 -m http.server 3222 --bind 127.0.0.1`, started from
     * /tmp by nobody in particular, was declared mine and killed, because "3222" appears
     * in its command line. A substring of somebody else's arguments is not evidence, and
     * this is the error direction the module itself calls the worse of the two: sparing
     * a stranger costs a port to shift off, killing one costs somebody else's run.
     */
    const squatter = { cwd: "/tmp", cmdline: "python3 -m http.server 3222 --bind 127.0.0.1" };
    const verdict = namesMe(squatter, { port: 3222, root: "/home/x/.claude/worktrees/US-18" });

    expect(verdict.mine).toBe(false);
    expect(verdict.why).toMatch(/port/i);
  });

  it("refuses, with its reason, when nothing about the process names me", () => {
    const verdict = namesMe({ cwd: "/home/someone/else", cmdline: "node server.js" }, { port: 5211, root: "/home/x" });
    expect(verdict.mine).toBe(false);
    expect(verdict.why).toMatch(/nothing|does not run under/i);
  });

  it("does not take an uninformative environ as evidence that a pid is not mine", () => {
    // The empty case must fall through to cwd/cmdline, never decide on its own.
    const verdict = namesMe(
      { cwd: mine.cwd, cmdline: mine.cmdline, environ: "" },
      { port: 5211, root: "/home/x/.claude/worktrees/US-18" },
    );
    expect(verdict.mine).toBe(true);
  });
});

describe("what the module refuses to be given", () => {
  it("will not launch on the project's defaults — ports and database are the caller's", async () => {
    const { launchApp } = await import("./app-lifecycle.mjs");
    await expect(launchApp({ repoRoot: work })).rejects.toThrow(/serverPort|clientPort|dbFile/);
  });

  it("stops from a handle that names only the ports — a later shell call has no pids", async () => {
    const { stopApp } = await import("./app-lifecycle.mjs");
    // Two ports nothing is listening on: nothing to kill, nothing to spare, and no
    // throw. This is the shape a second script rebuilds when the first one has exited.
    await expect(stopApp({ repoRoot: work, serverPort: 39187, clientPort: 39188 })).resolves.toMatchObject({
      portsFree: true,
    });
  });

  it("does not start a file watcher, so a run validating a commit cannot be overtaken", () => {
    const source = readFileSync(new URL("./app-lifecycle.mjs", import.meta.url), "utf8");
    expect(source).not.toMatch(/tsx\s+watch|npm:dev|run dev/);
  });
});

describe("what stopApp refuses to do quietly", () => {
  it("refuses a handle with no root, rather than sparing everything and reporting success", async () => {
    const { stopApp } = await import("./app-lifecycle.mjs");
    // The recommended way to stop is a handle rebuilt by hand in a later shell call,
    // so a forgotten field is a likely mistake — and without a root nothing can be
    // proved mine, so the call would spare the app and return as if it had stopped it.
    await expect(stopApp({ serverPort: 39187, clientPort: 39188 })).rejects.toThrow(/repoRoot/);
  });

  it("does not take a path mentioned in a stranger's arguments as proof of ownership", () => {
    const stranger = { cwd: "/tmp", cmdline: "python3 -m http.server 3222 --directory /home/x/US-18/docs" };
    expect(namesMe(stranger, { port: 3222, root: "/home/x/US-18" }).mine).toBe(false);
  });
});

describe("the proof of ownership is an exact place, not a prefix", () => {
  const ROOT = "/home/x/.claude/worktrees/US-18";

  it("accepts the three directories this app actually runs from", () => {
    for (const cwd of [ROOT, `${ROOT}/server`, `${ROOT}/client`]) {
      expect(namesMe({ cwd, cmdline: "node whatever" }, { root: ROOT }).mine).toBe(true);
    }
  });

  it("refuses a neighbour whose path merely starts the same way", () => {
    // This repository names its worktrees US-15a, US-16a, US-16b: `US-16` and `US-16a`
    // are one keystroke apart and one is a prefix of the other.
    const neighbour = { cwd: "/home/x/.claude/worktrees/US-18b/server", cmdline: "node server" };
    expect(namesMe(neighbour, { root: ROOT }).mine).toBe(false);
  });

  it("refuses a worktree nested inside the root — the case that would kill a colleague's server", () => {
    /*
     * Measured 2026-08-27, and it is not hypothetical: the worktrees of this repository
     * live INSIDE the main checkout, so `<main>/.claude/worktrees/US-18/server` starts
     * with `<main>`. An agent working from the main checkout — the ordinary case —
     * would have stopped a worktree agent's server as if it were its own. A trailing
     * slash does not fix this; only an exact place does.
     */
    const main = "/home/x/chess-analyst";
    const inAWorktree = { cwd: `${main}/.claude/worktrees/US-18/server`, cmdline: "node server" };
    expect(namesMe(inAWorktree, { root: main }).mine).toBe(false);
  });
});
