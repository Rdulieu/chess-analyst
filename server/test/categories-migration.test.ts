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
 * The upgrade to **five `Time control category`s** (US-12): chess.com's `daily`
 * becomes `correspondence` — the game's own word, the one that survives now
 * that chess.com is not the only Platform — and `classical` is added.
 *
 * Nothing rebuilds an `Evaluation` (ADR-0015), so this suite's real subject is
 * what the migration *preserves*, not what it renames.
 */

// A **file** database: `:memory:` cannot be reopened, and everything asserted
// here is about what a *second* open finds — the migration having run once.
const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "chess-analyst-"));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "../src/db/migrations");

/** The last migration applied *before* the one this suite is about. */
const LAST_FOUR_CATEGORY_MIGRATION = "0010_lame_smiling_tiger";

/**
 * A database at the schema it had when `daily` was still a category: the
 * committed migrations, replayed up to (and including) the last one before the
 * rename. Opening with `openDb` would run the very migration under test.
 */
function fourCategoryDb(): string {
  const dir = tempDir();
  const folder = join(dir, "migrations");
  cpSync(migrationsFolder, folder, { recursive: true });
  const journalPath = join(folder, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: { tag: string }[] };
  const cut = journal.entries.findIndex((e) => e.tag === LAST_FOUR_CATEGORY_MIGRATION);
  journal.entries = journal.entries.slice(0, cut + 1);
  writeFileSync(journalPath, JSON.stringify(journal));

  const file = join(dir, "test.db");
  const sqlite = new Database(file);
  migrate(drizzle(sqlite), { migrationsFolder: folder });
  sqlite.close();
  return file;
}

function query<T = Record<string, unknown>>(file: string, sql: string): T[] {
  const sqlite = new Database(file);
  const rows = sqlite.prepare(sql).all() as T[];
  sqlite.close();
  return rows;
}

function run(file: string, sql: string): void {
  const sqlite = new Database(file);
  sqlite.exec(sql);
  sqlite.close();
}

/** A Profile owning a Game per category, one of them the old `daily`. */
function seedHistory(file: string): void {
  run(
    file,
    `INSERT INTO profiles (id, platform, username, created_at)
       VALUES (1, 'chesscom', 'DudulSmash', '2026-01-01T00:00:00Z');
     INSERT INTO games (id, profile_id, game_url, pgn, opponent, player_color, result, date, time_control_category, analyzed)
       VALUES
         (1, 1, 'https://chess.com/1', '1. e4 e5', 'opp', 'white', 'win', '2026-01-01', 'blitz', 1),
         (2, 1, 'https://chess.com/2', '1. d4 d5', 'opp', 'white', 'loss', '2026-01-02', 'daily', 1),
         (3, 1, 'https://chess.com/3', '1. c4 e5', 'opp', 'black', 'draw', '2026-01-03', 'daily', 0);
     INSERT INTO move_habits (profile_id, fen, side, san, count, win, draw, loss, bullet, blitz, rapid, daily)
       VALUES (1, 'start-fen', 'white', 'e4', 12, 7, 2, 3, 1, 4, 2, 5);`,
  );
}

describe("the upgrade to five Time control categories", () => {
  it("renames every stored `daily` Game to `correspondence`, and loses no Game doing it", () => {
    const file = fourCategoryDb();
    seedHistory(file);

    openDb(file).sqlite.close();

    expect(
      query(file, "SELECT time_control_category AS c, count(*) AS n FROM games GROUP BY c ORDER BY c"),
    ).toEqual([
      { c: "blitz", n: 1 },
      { c: "correspondence", n: 2 },
    ]);
    expect(query(file, "SELECT count(*) AS n FROM games WHERE time_control_category = 'daily'")).toEqual(
      [{ n: 0 }],
    );
  });

  it("carries the analyzed Games across, and leaves their Evaluations to the migration that owns them", () => {
    const file = fourCategoryDb();
    seedHistory(file);
    run(
      file,
      `INSERT INTO evaluations (game_id, ply, fen, cp) VALUES (2, 0, 'fen-0', 15), (2, 1, 'fen-1', -30);`,
    );

    openDb(file).sqlite.close();

    // The Games themselves survive the recategorisation, which is what this
    // migration is about. Their Evaluations do **not** survive the open: a later
    // migration drops the rows that carry no `Best line` (ADR-0016, the named
    // exception to ADR-0015), and clears the flag that would otherwise call a
    // Game with no Evaluations analyzed. Asserted where it happens
    // (`best-line-migration.test.ts`). Amended rather than worked around: this
    // suite used to assert those rows were untouched, and that stopped being true.
    expect(query(file, "SELECT id FROM games ORDER BY id")).toEqual([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]);
    expect(query(file, "SELECT * FROM evaluations")).toEqual([]);
  });

  it("preserves the Move habit counters value-for-value under the renamed column", () => {
    const file = fourCategoryDb();
    seedHistory(file);

    openDb(file).sqlite.close();

    expect(
      query(
        file,
        "SELECT count, win, draw, loss, bullet, blitz, rapid, correspondence FROM move_habits",
      ),
    ).toEqual([
      { count: 12, win: 7, draw: 2, loss: 3, bullet: 1, blitz: 4, rapid: 2, correspondence: 5 },
    ]);
  });

  it("starts `classical` at zero — honest without a backfill, since chess.com never produced one", () => {
    const file = fourCategoryDb();
    seedHistory(file);

    openDb(file).sqlite.close();

    // The argument to check rather than assume: every pre-existing row comes
    // from chess.com, whose four categories never included `classical`. Zero is
    // therefore the true count, not a placeholder.
    expect(query(file, "SELECT classical FROM move_habits")).toEqual([{ classical: 0 }]);
    expect(query(file, "SELECT sum(bullet + blitz + rapid + correspondence) AS n FROM move_habits")).toEqual(
      [{ n: 12 }],
    );
  });

  it("is a no-op the second time round — no counter moved, no category changed", () => {
    const file = fourCategoryDb();
    seedHistory(file);
    openDb(file).sqlite.close();
    const after = query(file, "SELECT * FROM move_habits");
    const games = query(file, "SELECT * FROM games ORDER BY id");

    openDb(file).sqlite.close();

    expect(query(file, "SELECT * FROM move_habits")).toEqual(after);
    expect(query(file, "SELECT * FROM games ORDER BY id")).toEqual(games);
  });
});
