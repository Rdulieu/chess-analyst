import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { games, evaluations, type NewGame } from "../src/db/schema";
import { getGameAnnotations } from "../src/annotations/repository";

function tempDb() {
  return openDb(":memory:").db;
}

let urlSeq = 0;
function seedGame(db: ReturnType<typeof tempDb>, game: Partial<NewGame> & Pick<NewGame, "pgn">) {
  return db
    .insert(games)
    .values({
      gameUrl: `https://chess.com/g/${urlSeq++}`,
      opponent: "opp",
      playerColor: "white",
      result: "win",
      date: "2026-01-01",
      timeControlCategory: "blitz",
      analyzed: true,
      ...game,
    })
    .returning()
    .get();
}

function seedEvaluation(
  db: ReturnType<typeof tempDb>,
  gameId: number,
  ply: number,
  evaluation: { cp?: number | null; mate?: number | null },
) {
  db.insert(evaluations)
    .values({ gameId, ply, cp: evaluation.cp ?? null, mate: evaluation.mate ?? null })
    .run();
}

describe("getGameAnnotations", () => {
  it("returns undefined when no Game has that id", () => {
    const db = tempDb();

    expect(getGameAnnotations(db, 999)).toBeUndefined();
  });

  it("reports analyzed:false and no plies for a not-yet-analyzed Game", () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4", analyzed: false });

    expect(getGameAnnotations(db, game.id)).toEqual({ analyzed: false, plies: [] });
  });

  it("returns the per-ply annotations for an analyzed Game", () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5", playerColor: "white" });
    seedEvaluation(db, game.id, 0, { cp: 0 });
    seedEvaluation(db, game.id, 1, { cp: 0 });
    seedEvaluation(db, game.id, 2, { cp: 0 });

    const result = getGameAnnotations(db, game.id);

    expect(result?.analyzed).toBe(true);
    expect(result?.plies).toHaveLength(3);
  });
});
