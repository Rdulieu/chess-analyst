import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { openDb } from "../src/db";
import { games, evaluations } from "../src/db/schema";
import { gamePositions } from "../src/chess/positions";

// A **file** database: `:memory:` cannot be reopened, and "a second open does
// no work" is the property that matters here.
const dirs: string[] = [];
function tempFile(): string {
  const dir = mkdtempSync(join(tmpdir(), "chess-analyst-"));
  dirs.push(dir);
  return join(dir, "test.db");
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** An analyzed Game whose `Evaluation`s predate the `fen` column — what the
 *  migration's default leaves behind. Written through raw SQL, since the schema
 *  no longer lets any insert path omit the FEN. Short Games on purpose: the
 *  longest Game of the real history costs 105 ms to replay on its own. */
function seedPreFenGame(file: string, pgn: string): number {
  const sqlite = new Database(file);
  const { id } = sqlite
    .prepare(
      `INSERT INTO games (game_url, pgn, opponent, player_color, result, date, time_control_category, analyzed)
       VALUES (?, ?, 'opp', 'white', 'win', '2026-01-01', 'blitz', 1) RETURNING id`,
    )
    .get(`fixture://pre-fen/${Math.abs(hash(pgn))}`, pgn) as { id: number };
  const insert = sqlite.prepare(`INSERT INTO evaluations (game_id, ply, fen, cp) VALUES (?, ?, '', 0)`);
  const plies = pgn.trim() === "" ? 1 : pgn.split(" ").filter((t) => !t.endsWith(".")).length + 1;
  for (let ply = 0; ply < plies; ply++) insert.run(id, ply);
  sqlite.close();
  return id;
}

function hash(s: string): number {
  return [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
}

describe("openDb — Evaluations that predate the stored FEN", () => {
  it("repairs them from the Game's PGN, with no manual step and no engine run", () => {
    const file = tempFile();
    openDb(file).sqlite.close(); // first open: schema only
    const id = seedPreFenGame(file, "1. e4 e5");

    const { db, sqlite } = openDb(file);

    const rows = db
      .select()
      .from(evaluations)
      .where(eq(evaluations.gameId, id))
      .all()
      .sort((a, b) => a.ply - b.ply);
    expect(rows.map((r) => r.fen)).toEqual(gamePositions("1. e4 e5"));
    sqlite.close();
  });

  it("does nothing on a second open", () => {
    const file = tempFile();
    openDb(file).sqlite.close();
    seedPreFenGame(file, "1. e4 e5");

    const first = openDb(file);
    first.sqlite.close();
    const second = openDb(file);

    expect(first.repairedEvaluations).toBe(3);
    expect(second.repairedEvaluations).toBe(0);
    second.sqlite.close();
  });

  it("drops the Evaluations of a Game whose PGN cannot be replayed, and un-analyzes it", () => {
    const file = tempFile();
    openDb(file).sqlite.close();
    // Losing an engine pass is acceptable in dev phase; serving wrong FENs is not.
    const id = seedPreFenGame(file, "1. e4 Qxz9");

    const { db, sqlite } = openDb(file);

    expect(db.select().from(evaluations).where(eq(evaluations.gameId, id)).all()).toEqual([]);
    expect(db.select().from(games).where(eq(games.id, id)).get()!.analyzed).toBe(false);
    sqlite.close();
  });
});
