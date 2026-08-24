import { describe, it, expect, afterEach } from "vitest";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { openDb } from "../src/db";
import { games, personalAnalyses, personalMarks } from "../src/db/schema";
import { MORPHY_GAME } from "./fixtures";
import { getPersonalAnalysis, writeMark } from "../src/personal/repository";
import { resolveProfile } from "../src/profiles/repository";

/**
 * The migration that makes the `Personal analysis` storable (ADR-0019). It is
 * **purely additive**, which is what this suite is here to prove rather than
 * assert in a comment: the tables appear, an existing database keeps everything
 * it had — the `Evaluation`s above all, since nothing but engine time rebuilds
 * them (ADR-0015) — and a **second** run changes nothing.
 *
 * A **file** database throughout, like `best-line-migration.test.ts` and
 * `profiles-migration.test.ts`: everything here is about what a *second* open
 * finds.
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
const LAST_PRE_PERSONAL_MIGRATION = "0012_best_line_and_search_regime";

/**
 * A database at the schema *before* this upgrade, holding a Profile, its Game
 * and one `Evaluation`. The committed migrations are replayed up to the last one
 * preceding it — opening with `openDb` would run the very migration under test,
 * and there would be no "before" left to compare against.
 */
function legacyDb(): { file: string; gameId: number } {
  const dir = tempDir();
  const folder = join(dir, "migrations");
  cpSync(migrationsFolder, folder, { recursive: true });
  const journalPath = join(folder, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: { tag: string }[] };
  const cut = journal.entries.findIndex((e) => e.tag === LAST_PRE_PERSONAL_MIGRATION);
  journal.entries = journal.entries.slice(0, cut + 1);
  writeFileSync(journalPath, JSON.stringify(journal));

  const file = join(dir, "test.db");
  const sqlite = new Database(file);
  migrate(drizzle(sqlite), { migrationsFolder: folder });
  sqlite
    .prepare("INSERT INTO profiles (platform, username, created_at) VALUES ('chesscom','Dudul','2026-01-01')")
    .run();
  const game = sqlite
    .prepare(
      `INSERT INTO games (profile_id, game_url, pgn, opponent, player_color, result, date, time_control_category, analyzed)
       VALUES (1, ?, ?, 'opp', 'white', 'win', '2026-01-01', 'blitz', 1) RETURNING id`,
    )
    .get(MORPHY_GAME.gameUrl, MORPHY_GAME.pgn) as { id: number };
  sqlite
    .prepare(
      "INSERT INTO evaluations (game_id, ply, fen, cp, pv) VALUES (?, 1, 'startpos', 25, 'e2e4')",
    )
    .run(game.id);
  sqlite.close();
  return { file, gameId: game.id };
}

describe("the Personal analysis migration", () => {
  it("creates its two tables on a database that had neither", () => {
    const { file } = legacyDb();

    expect(
      query<{ name: string }>(
        file,
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'personal_%'",
      ),
    ).toEqual([]);

    openDb(file).sqlite.close();

    expect(
      query<{ name: string }>(
        file,
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'personal_%' ORDER BY name",
      ).map((r) => r.name),
    ).toEqual(["personal_analyses", "personal_marks"]);
  });

  it("leaves everything the database already held standing — the Evaluations above all", () => {
    const { file, gameId } = legacyDb();

    openDb(file).sqlite.close();

    expect(query(file, "SELECT * FROM profiles")).toHaveLength(1);
    expect(query(file, "SELECT * FROM games")).toHaveLength(1);
    // The rows nothing but engine time rebuilds (ADR-0015): this migration must
    // not even be in a position to touch them.
    expect(query(file, `SELECT ply, cp, pv FROM evaluations WHERE game_id = ${gameId}`)).toEqual([
      { ply: 1, cp: 25, pv: "e2e4" },
    ]);
  });

  it("is re-runnable: a second open finds the tables, changes nothing, and keeps the readings", () => {
    const { file, gameId } = legacyDb();

    const first = openDb(file);
    writeMark(first.db, gameId, 3, { declaredSeverity: "mistake" });
    first.sqlite.close();

    // The upgrade running again over its own result is the honest test of
    // "re-runnable" — and it must not cost the Player the reading they wrote.
    const second = openDb(file);
    expect(getPersonalAnalysis(second.db, gameId)?.marks).toEqual([
      { ply: 3, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false },
    ]);
    second.sqlite.close();
  });

  it("takes the reading and its marks with the Game, in one deletion", () => {
    const { db, sqlite } = openDb(":memory:");
    const profile = resolveProfile(db, "chesscom", "Dudul").profile;
    const game = db
      .insert(games)
      .values({ ...MORPHY_GAME, profileId: profile.id })
      .returning()
      .get();
    writeMark(db, game.id, 2, { declaredSeverity: "blunder" });

    db.delete(games).where(eq(games.id, game.id)).run();

    expect(db.select().from(personalAnalyses).all()).toEqual([]);
    expect(db.select().from(personalMarks).all()).toEqual([]);
    sqlite.close();
  });

  it("declares the cascade from BOTH parents, so no application code has to remember it", () => {
    const { file } = legacyDb();
    openDb(file).sqlite.close();

    const parents = query<{ table: string; on_delete: string }>(
      file,
      "SELECT \"table\", \"on_delete\" FROM pragma_foreign_key_list('personal_analyses')",
    );
    expect(parents.sort((a, b) => a.table.localeCompare(b.table))).toEqual([
      { table: "games", on_delete: "CASCADE" },
      { table: "profiles", on_delete: "CASCADE" },
    ]);
    expect(
      query<{ on_delete: string }>(
        file,
        "SELECT \"on_delete\" FROM pragma_foreign_key_list('personal_marks')",
      ),
    ).toEqual([{ on_delete: "CASCADE" }]);
  });
});
