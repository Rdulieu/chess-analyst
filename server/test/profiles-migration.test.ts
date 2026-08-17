import { describe, it, expect, afterEach } from "vitest";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { openDb } from "../src/db";
import { profiles } from "../src/db/schema";

// A **file** database: `:memory:` cannot be reopened, and everything this suite
// asserts is about what a *second* open finds — the migration having run once.
const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "chess-analyst-"));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const migrationsFolder = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/db/migrations",
);

/** The last migration applied *before* the one this suite is about. */
const LAST_PRE_PROFILE_MIGRATION = "0009_sloppy_squirrel_girl";

/**
 * A database at the schema it had **before** Profiles owned anything: the
 * committed migrations, replayed up to (and including) the last pre-Profile one.
 * That is the only honest starting point — opening with `openDb` would run the
 * very migration under test.
 */
function legacyDb(): string {
  const dir = tempDir();
  const folder = join(dir, "migrations");
  cpSync(migrationsFolder, folder, { recursive: true });
  const journalPath = join(folder, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: { tag: string }[];
  };
  const cut = journal.entries.findIndex((e) => e.tag === LAST_PRE_PROFILE_MIGRATION);
  journal.entries = journal.entries.slice(0, cut + 1);
  writeFileSync(journalPath, JSON.stringify(journal));

  const file = join(dir, "test.db");
  const sqlite = new Database(file);
  migrate(drizzle(sqlite), { migrationsFolder: folder });
  sqlite.close();
  return file;
}

function pgn(white: string, black: string): string {
  return `[White "${white}"]\n[Black "${black}"]\n\n1. e4 e5 1-0`;
}

/**
 * A Game as it was stored before `profile_id` existed — raw SQL, since the new
 * schema no longer lets any insert path omit the owner.
 */
function seedGame(
  file: string,
  { url, color = "white", analyzed = false }: { url: string; color?: "white" | "black"; analyzed?: boolean },
): number {
  const sqlite = new Database(file);
  const players = color === "white" ? ["DudulSmash", "opp"] : ["opp", "DudulSmash"];
  const { id } = sqlite
    .prepare(
      `INSERT INTO games (game_url, pgn, opponent, player_color, result, date, time_control_category, analyzed)
       VALUES (?, ?, 'opp', ?, 'win', '2026-01-01', 'blitz', ?) RETURNING id`,
    )
    .get(url, pgn(players[0], players[1]), color, analyzed ? 1 : 0) as { id: number };
  sqlite.close();
  return id;
}

/** `Evaluation`s of an already-analyzed Game — the rows only engine time rebuilds. */
function seedEvaluations(file: string, gameId: number, count: number): void {
  const sqlite = new Database(file);
  const insert = sqlite.prepare(
    `INSERT INTO evaluations (game_id, ply, fen, cp) VALUES (?, ?, ?, ?)`,
  );
  for (let ply = 0; ply < count; ply++) insert.run(gameId, ply, `fen-${ply}`, ply * 10);
  sqlite.close();
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

describe("the upgrade to Profiles — existing data belongs to its Player", () => {
  it("creates the Profile the existing Games were played by, and assigns them to it", () => {
    const file = legacyDb();
    seedGame(file, { url: "https://chess.com/1" });
    seedGame(file, { url: "https://chess.com/2", color: "black" });

    openDb(file).sqlite.close();

    const [profile] = query<{ id: number; platform: string; username: string }>(
      file,
      "SELECT id, platform, username FROM profiles",
    );
    expect(profile).toMatchObject({ platform: "chesscom", username: "DudulSmash" });
    expect(
      query(file, `SELECT id FROM games WHERE profile_id IS NULL OR profile_id <> ${profile.id}`),
    ).toEqual([]);
  });

  it("carries an analyzed Game's Evaluations across untouched — the rows no re-import rebuilds", () => {
    const file = legacyDb();
    const id = seedGame(file, { url: "https://chess.com/1", analyzed: true });
    seedEvaluations(file, id, 40);
    const before = query(file, "SELECT * FROM evaluations ORDER BY game_id, ply");

    openDb(file).sqlite.close();

    expect(query(file, "SELECT * FROM evaluations ORDER BY game_id, ply")).toEqual(before);
    expect(query(file, "SELECT analyzed FROM games")).toEqual([{ analyzed: 1 }]);
  });

  it("assigns the existing Move habits, and lets a second Profile count the same Move without colliding", () => {
    const file = legacyDb();
    seedGame(file, { url: "https://chess.com/1" });
    run(
      file,
      `INSERT INTO move_habits (fen, side, san, count) VALUES ('start-fen', 'white', 'e4', 12)`,
    );

    openDb(file).sqlite.close();

    const [owner] = query<{ id: number }>(file, "SELECT id FROM profiles");
    expect(query(file, "SELECT profile_id, count FROM move_habits")).toEqual([
      { profile_id: owner.id, count: 12 },
    ]);

    // The same Move, from the same Position, under another Profile: a second
    // row, not a clash — which is the whole point of the key gaining the owner.
    run(
      file,
      `INSERT INTO profiles (platform, username, created_at) VALUES ('chesscom', 'Friend', '2026-01-01');
       INSERT INTO move_habits (profile_id, fen, side, san, count)
       SELECT id, 'start-fen', 'white', 'e4', 3 FROM profiles WHERE username = 'Friend'`,
    );
    expect(query(file, "SELECT count FROM move_habits ORDER BY count")).toEqual([
      { count: 3 },
      { count: 12 },
    ]);
  });

  it("reports the existing Analysis pass under the Profile it ran for", () => {
    const file = legacyDb();
    seedGame(file, { url: "https://chess.com/1", analyzed: true });
    run(
      file,
      `INSERT INTO analysis_passes (game_ids, total, started_at, outcome)
       VALUES ('[1]', 40, '2026-01-01T00:00:00Z', 'completed')`,
    );

    openDb(file).sqlite.close();

    const [owner] = query<{ id: number }>(file, "SELECT id FROM profiles");
    expect(query(file, "SELECT profile_id, total, outcome FROM analysis_passes")).toEqual([
      { profile_id: owner.id, total: 40, outcome: "completed" },
    ]);
  });

  it("refuses to guess when the aggregates could belong to either of two Players, and changes nothing", () => {
    const file = legacyDb();
    seedGame(file, { url: "https://chess.com/1" });
    const sqlite = new Database(file);
    sqlite
      .prepare(
        `INSERT INTO games (game_url, pgn, opponent, player_color, result, date, time_control_category)
         VALUES ('https://chess.com/2', ?, 'opp', 'white', 'win', '2026-01-01', 'blitz')`,
      )
      .run(pgn("SomeoneElse", "opp"));
    sqlite.close();
    run(file, `INSERT INTO move_habits (fen, side, san, count) VALUES ('start-fen', 'white', 'e4', 12)`);

    // Move habits pooled from two Players cannot be split back apart, and no
    // "legacy" Profile is allowed to absorb them: the upgrade stops instead.
    expect(() => openDb(file)).toThrow(/__new_move_habits/);
    expect(query(file, "SELECT count FROM move_habits")).toEqual([{ count: 12 }]);
    expect(query(file, "SELECT id FROM profiles")).toEqual([]);
  });

  it("is a no-op the second time round — no second Profile, no row moved", () => {
    const file = legacyDb();
    const id = seedGame(file, { url: "https://chess.com/1", analyzed: true });
    seedEvaluations(file, id, 40);
    run(file, `INSERT INTO move_habits (fen, side, san, count) VALUES ('start-fen', 'white', 'e4', 12)`);

    openDb(file).sqlite.close();
    const after = {
      profiles: query(file, "SELECT * FROM profiles"),
      games: query(file, "SELECT * FROM games"),
      habits: query(file, "SELECT * FROM move_habits"),
      evaluations: query(file, "SELECT * FROM evaluations ORDER BY game_id, ply"),
    };

    openDb(file).sqlite.close();

    expect({
      profiles: query(file, "SELECT * FROM profiles"),
      games: query(file, "SELECT * FROM games"),
      habits: query(file, "SELECT * FROM move_habits"),
      evaluations: query(file, "SELECT * FROM evaluations ORDER BY game_id, ply"),
    }).toEqual(after);
  });

  it("takes the Profile that is already there rather than creating a second one for the same account", () => {
    const file = legacyDb();
    seedGame(file, { url: "https://chess.com/1" });
    // Slice 01 already lets the Player create a Profile by hand — possibly this
    // very account, spelled by chess.com, before the upgrade ever runs.
    run(
      file,
      `INSERT INTO profiles (platform, username, created_at) VALUES ('chesscom', 'DudulSmash', '2026-01-01T00:00:00Z')`,
    );

    openDb(file).sqlite.close();

    expect(query(file, "SELECT username, created_at FROM profiles")).toEqual([
      { username: "DudulSmash", created_at: "2026-01-01T00:00:00Z" },
    ]);
    expect(query(file, "SELECT id FROM games WHERE profile_id IS NULL")).toEqual([]);
  });

  it("drops the remembered-username setting instead of migrating it — the Profile replaces it", () => {
    const file = legacyDb();
    seedGame(file, { url: "https://chess.com/1" });
    run(file, `INSERT INTO settings (key, value) VALUES ('chesscom_username', 'DudulSmash')`);

    openDb(file).sqlite.close();

    expect(query(file, "SELECT key FROM settings")).toEqual([]);
  });
});
