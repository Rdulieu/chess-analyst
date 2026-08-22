import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { gamePositions } from "../src/chess/positions";
import { fixtureBestLine } from "../src/engine/fixture";
import { games, evaluations, type NewGame } from "../src/db/schema";
import { getGameAnnotations } from "../src/annotations/repository";
import { seedProfile } from "./fixtures";

function tempDb() {
  return openDb(":memory:").db;
}

let urlSeq = 0;
function seedGame(db: ReturnType<typeof tempDb>, game: Partial<NewGame> & Pick<NewGame, "pgn">) {
  return db
    .insert(games)
    .values({
      profileId: seedProfile(db),
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

/** Stores one Evaluation the way the `Analysis pass` does — FEN included,
 *  read back from the Game's own PGN (ADR-0012). */
function seedEvaluation(
  db: ReturnType<typeof tempDb>,
  game: { id: number; pgn: string },
  ply: number,
  evaluation: { cp?: number | null; mate?: number | null },
) {
  const fen = gamePositions(game.pgn)[ply];
  db.insert(evaluations)
    .values({
      gameId: game.id,
      ply,
      fen,
      cp: evaluation.cp ?? null,
      mate: evaluation.mate ?? null,
      // A stored Evaluation always carries its `Best line` (ADR-0016), and a
      // fixture's has to be playable from the Position: it is drawn on the board
      // and replayed ply by ply by whoever reads it.
      pv: fixtureBestLine(fen).join(" "),
    })
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
    seedEvaluation(db, game, 0, { cp: 0 });
    seedEvaluation(db, game, 1, { cp: 0 });
    seedEvaluation(db, game, 2, { cp: 0 });

    const result = getGameAnnotations(db, game.id);

    expect(result?.analyzed).toBe(true);
    expect(result?.plies).toHaveLength(3);
  });
});
