import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { games, evaluations, type NewGame } from "../src/db/schema";
import { getDangerPositions } from "../src/danger/repository";

function tempDb() {
  return openDb(":memory:").db;
}

let urlSeq = 0;
/** Inserts an analyzed Game (playing card for `getDangerPositions`). */
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

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

describe("getDangerPositions", () => {
  it("counts a Position reached once, with no serious error, at 0% proportion", () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4" });
    seedEvaluation(db, game.id, 0, { cp: 0 });
    seedEvaluation(db, game.id, 1, { cp: 0 });

    const dangers = getDangerPositions(db);

    const start = dangers.find((d) => d.fen === START_FEN);
    expect(start).toMatchObject({ reached: 1, seriousErrors: 0, proportion: 0 });
  });

  it("merges Positions reached via different move orders (transposition)", () => {
    const db = tempDb();
    // Both reach the same Position before 3. Nc3 (and the same one after it),
    // via a different move order — the move-habits fixture's own regression.
    const g1 = seedGame(db, { pgn: "1. d4 Nf6 2. c4 e6 3. Nc3", playerColor: "black" });
    const g2 = seedGame(db, { pgn: "1. c4 e6 2. d4 Nf6 3. Nc3", playerColor: "black" });
    for (const ply of [0, 1, 2, 3, 4, 5]) {
      seedEvaluation(db, g1.id, ply, { cp: 0 });
      seedEvaluation(db, g2.id, ply, { cp: 0 });
    }

    const dangers = getDangerPositions(db);

    // 12 Position-instances (6 plies × 2 Games) collapse to 9 distinct FENs:
    // start, the pre-/post-Nc3 Positions merge (reached 2), the 3 in-between
    // plies differ by move order and stay singletons (reached 1) per Game.
    expect(dangers).toHaveLength(9);
    expect(dangers.filter((d) => d.reached === 2)).toHaveLength(3);
  });

  it("counts a serious error within the next 10 half-moves, but not the 11th", () => {
    const db = tempDb();
    const RUY_LOPEZ = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7";
    const RUY_LOPEZ_PLUS_ONE = RUY_LOPEZ + " 6. Re1 b5";

    // White blunders on the 9th half-move (ply 8→9) — the 9th Move ahead of
    // the start Position, still inside its 10-half-move look-ahead window.
    const within = seedGame(db, { pgn: RUY_LOPEZ, playerColor: "white" });
    for (const ply of [0, 1, 2, 3, 4, 5, 6, 7]) seedEvaluation(db, within.id, ply, { cp: 0 });
    seedEvaluation(db, within.id, 8, { cp: 0 });
    seedEvaluation(db, within.id, 9, { cp: 1000 }); // Black-relative: White is now losing badly.
    seedEvaluation(db, within.id, 10, { cp: 0 });

    // Same blunder, but on the 11th half-move (ply 10→11) — one Move past the window.
    const outside = seedGame(db, { pgn: RUY_LOPEZ_PLUS_ONE, playerColor: "white" });
    for (const ply of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) seedEvaluation(db, outside.id, ply, { cp: 0 });
    seedEvaluation(db, outside.id, 10, { cp: 0 });
    seedEvaluation(db, outside.id, 11, { cp: 1000 });
    seedEvaluation(db, outside.id, 12, { cp: 0 });

    const dangers = getDangerPositions(db);

    const start = dangers.find((d) => d.fen === START_FEN)!;
    expect(start).toMatchObject({ reached: 2, seriousErrors: 1, proportion: 0.5 });
  });

  it("sorts entries by reach count descending", () => {
    const db = tempDb();
    const g1 = seedGame(db, { pgn: "1. e4 e5" });
    const g2 = seedGame(db, { pgn: "1. d4 d5" });
    for (const ply of [0, 1, 2]) {
      seedEvaluation(db, g1.id, ply, { cp: 0 });
      seedEvaluation(db, g2.id, ply, { cp: 0 });
    }

    const dangers = getDangerPositions(db);

    // The start Position is reached by both Games (2); every other Position
    // (differing after move 1) is reached by only one (1).
    expect(dangers[0]).toMatchObject({ fen: START_FEN, reached: 2 });
    expect(dangers.slice(1).every((d) => d.reached === 1)).toBe(true);
  });

  it("ignores Games that have not been analyzed", () => {
    const db = tempDb();
    seedGame(db, { pgn: "1. e4", analyzed: false });

    const dangers = getDangerPositions(db);

    expect(dangers).toEqual([]);
  });
});
