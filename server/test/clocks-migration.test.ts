import { describe, it, expect, afterEach } from "vitest";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { openDb } from "../src/db";

/**
 * The three columns US-15b adds to `games` (slice 04): the **last Clock** — the
 * one reading belonging to no Move — and the two plies of the `Lichess
 * division`.
 *
 * **All three are permanently nullable, and that is the point of this suite.**
 * `CLAUDE.md`'s discipline is nullable → backfill → `NOT NULL`, the tightening
 * acting as the assertion. It does **not** apply here: chess.com exposes no
 * equivalent of either fact, and a Game that ended in **mate** has no last Clock
 * at all (the clocks array then holds exactly as many entries as half-moves —
 * measured on eight Games, four terminations, 2026-09-08). Nothing will ever
 * make these columns complete, so nothing may tighten them.
 *
 * Nothing rebuilds an `Evaluation` (ADR-0015), so what this suite really asserts
 * is what the migration **preserves**.
 */

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "chess-analyst-clocks-"));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../src/db/migrations");

/** The last migration applied *before* the one this suite is about. */
const BEFORE_CLOCKS = "0014_personal_marks_layers";

/** A database at the schema it had before the three columns existed. */
function preClocksDb(): string {
  const dir = tempDir();
  const folder = join(dir, "migrations");
  cpSync(migrationsFolder, folder, { recursive: true });
  const journalPath = join(folder, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: { tag: string }[] };
  const cut = journal.entries.findIndex((e) => e.tag === BEFORE_CLOCKS);
  journal.entries = journal.entries.slice(0, cut + 1);
  writeFileSync(journalPath, JSON.stringify(journal));

  const file = join(dir, "before.db");
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  migrate(drizzle(sqlite), { migrationsFolder: folder });
  sqlite.close();
  return file;
}

/** A Profile, a Game and one Evaluation of it — the thing that must survive. */
function seedGameWithEvaluation(file: string): void {
  const sqlite = new Database(file);
  sqlite
    .prepare("INSERT INTO profiles (id, platform, username, created_at) VALUES (1,'lichess','Metalyst','2026-01-01')")
    .run();
  sqlite
    .prepare(
      `INSERT INTO games (id, profile_id, game_url, pgn, opponent, player_color, result, date,
        time_control_category, eco, opening_name, analyzed)
       VALUES (1, 1, 'https://lichess.org/abc', '1. e4 e5', 'opp', 'white', 'win', '2026-01-01',
        'blitz', 'C20', 'Open Game', 1)`,
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO evaluations (game_id, ply, fen, cp, mate, pv)
       VALUES (1, 0, 'startfen', 21, NULL, 'e2e4 e7e5')`,
    )
    .run();
  sqlite.close();
}

describe("the last-Clock and Lichess-division migration", () => {
  it("adds the three columns, and leaves every existing row null in them", () => {
    const file = preClocksDb();
    seedGameWithEvaluation(file);

    const { sqlite } = openDb(file);
    const row = sqlite
      .prepare("SELECT last_clock_cs, division_middle_ply, division_end_ply FROM games WHERE id = 1")
      .get() as Record<string, unknown>;

    // Null, not zero: a chess.com Game has no such fact, and a `0` would be a
    // last Clock of nothing left — a measurement nobody took.
    expect(row).toEqual({
      last_clock_cs: null,
      division_middle_ply: null,
      division_end_ply: null,
    });
    sqlite.close();
  });

  it("preserves the Evaluations, which only engine time could rebuild", () => {
    const file = preClocksDb();
    seedGameWithEvaluation(file);

    const { sqlite } = openDb(file);
    const evaluation = sqlite.prepare("SELECT * FROM evaluations WHERE game_id = 1").get() as Record<
      string,
      unknown
    >;

    expect(evaluation.cp).toBe(21);
    expect(evaluation.pv).toBe("e2e4 e7e5");
    sqlite.close();
  });

  it("is re-runnable: opening the database a second time changes nothing", () => {
    const file = preClocksDb();
    seedGameWithEvaluation(file);

    const first = openDb(file);
    first.sqlite
      .prepare("UPDATE games SET last_clock_cs = 4653, division_middle_ply = 20 WHERE id = 1")
      .run();
    first.sqlite.close();

    // A second open re-runs the migrator, which must find its work done rather
    // than re-add a column (which would throw) or reset what was written.
    const second = openDb(file);
    const row = second.sqlite
      .prepare("SELECT last_clock_cs, division_middle_ply FROM games WHERE id = 1")
      .get() as Record<string, unknown>;
    expect(row).toEqual({ last_clock_cs: 4653, division_middle_ply: 20 });
    second.sqlite.close();
  });

  it("leaves the three columns nullable, permanently and on purpose", () => {
    const file = preClocksDb();
    const { sqlite } = openDb(file);

    const columns = sqlite.prepare("PRAGMA table_info(games)").all() as {
      name: string;
      notnull: number;
    }[];
    for (const name of ["last_clock_cs", "division_middle_ply", "division_end_ply"]) {
      const column = columns.find((c) => c.name === name);
      expect(column, `${name} should exist`).toBeDefined();
      // If this ever fails because somebody tightened one, read the comment at
      // the top of this file before "fixing" it: a mate has no last Clock, and
      // chess.com has neither fact at all.
      expect(column!.notnull, `${name} must stay nullable`).toBe(0);
    }
    sqlite.close();
  });
});
