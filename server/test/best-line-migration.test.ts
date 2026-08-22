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
 * The upgrade that makes the `Best line` storable (ADR-0016) is the one schema
 * change of this project that **drops data only engine time can rebuild** — the
 * named exception to ADR-0015. So what it must leave standing is worth asserting
 * outright: the Evaluations go, and **nothing else** does.
 *
 * A **file** database, like `profiles-migration.test.ts`: everything here is
 * about what a *second* open finds.
 */
const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "chess-analyst-"));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function query<T = Record<string, unknown>>(file: string, sql: string): T[] {
  const sqlite = new Database(file);
  const rows = sqlite.prepare(sql).all() as T[];
  sqlite.close();
  return rows;
}

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../src/db/migrations");

/** The last migration applied *before* the one this suite is about. */
const LAST_PRE_BEST_LINE_MIGRATION = "0010_lame_smiling_tiger";

/**
 * A database at the schema *before* this upgrade, holding an analyzed Game and
 * its Evaluations. The committed migrations are replayed up to the last one
 * preceding it — opening with `openDb` would run the very migration under test,
 * and there would be no legacy Evaluation left to seed.
 */
function analyzedDb(): string {
  const dir = tempDir();
  const folder = join(dir, "migrations");
  cpSync(migrationsFolder, folder, { recursive: true });
  const journalPath = join(folder, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: { tag: string }[] };
  const cut = journal.entries.findIndex((e) => e.tag === LAST_PRE_BEST_LINE_MIGRATION);
  journal.entries = journal.entries.slice(0, cut + 1);
  writeFileSync(journalPath, JSON.stringify(journal));

  const file = join(dir, "test.db");
  const sqlite = new Database(file);
  migrate(drizzle(sqlite), { migrationsFolder: folder });
  sqlite.exec(`
    INSERT INTO profiles (platform, username, created_at) VALUES ('chesscom', 'DudulSmash', '2026-01-01');
    INSERT INTO games (profile_id, game_url, pgn, opponent, player_color, result, date,
                       time_control_category, eco, opening_name, move_habits_computed, analyzed)
    VALUES (1, 'https://chess.com/1', '[White "DudulSmash"]

1. e4 e5 1-0', 'opp', 'white', 'win', '2026-01-01', 'blitz', 'C20', 'King''s Pawn', 1, 1);
    INSERT INTO move_habits (profile_id, fen, side, san, count) VALUES (1, 'start-fen', 'white', 'e4', 12);
  `);
  const insert = sqlite.prepare(`INSERT INTO evaluations (game_id, ply, fen, cp) VALUES (1, ?, ?, ?)`);
  for (let ply = 0; ply < 3; ply++) insert.run(ply, `fen-${ply}`, ply * 10);
  sqlite.close();
  return file;
}

describe("the upgrade to a stored Best line", () => {
  it("leaves the Player's own data standing — the Game, its PGN, its Opening, its Move habits", () => {
    const file = analyzedDb();

    openDb(file).sqlite.close();

    expect(query(file, "SELECT username FROM profiles")).toEqual([{ username: "DudulSmash" }]);
    expect(query(file, "SELECT game_url, eco, opening_name, move_habits_computed FROM games")).toEqual([
      {
        game_url: "https://chess.com/1",
        eco: "C20",
        opening_name: "King's Pawn",
        move_habits_computed: 1,
      },
    ]);
    expect(query(file, "SELECT pgn FROM games")[0].pgn).toContain("1. e4 e5");
    expect(query(file, "SELECT count FROM move_habits")).toEqual([{ count: 12 }]);
  });

  it("drops the Evaluations that carry no Best line, and stops calling their Game analyzed", () => {
    const file = analyzedDb();

    openDb(file).sqlite.close();

    // Named data loss (ADR-0015): a legacy Evaluation cannot gain a line it never
    // recorded, and a Game with no Evaluations left is not an analyzed Game — it
    // is one the Player can re-analyze, which is what re-offers the pass.
    expect(query(file, "SELECT * FROM evaluations")).toEqual([]);
    expect(query(file, "SELECT analyzed FROM games")).toEqual([{ analyzed: 0 }]);
  });

  it("requires a Best line on every Evaluation stored from now on", () => {
    const file = analyzedDb();
    openDb(file).sqlite.close();

    const sqlite = new Database(file);
    expect(() =>
      sqlite.prepare(`INSERT INTO evaluations (game_id, ply, fen, cp) VALUES (1, 0, 'fen', 10)`).run(),
    ).toThrow(/NOT NULL/);
    sqlite.close();
  });

  it("gives the pass its Search regime", () => {
    const file = analyzedDb();

    openDb(file).sqlite.close();

    expect(query(file, "SELECT name FROM pragma_table_info('analysis_passes')").map((r) => r.name))
      .toEqual(expect.arrayContaining(["depth", "lines"]));
  });
});
