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
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3";
const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6";

describe("getDangerPositions", () => {
  it("counts a recurring Position with no serious error at 0% proportion", () => {
    const db = tempDb();
    for (let n = 0; n < 2; n++) {
      const game = seedGame(db, { pgn: "1. e4" });
      seedEvaluation(db, game.id, 0, { cp: 0 });
      seedEvaluation(db, game.id, 1, { cp: 0 });
    }

    const dangers = getDangerPositions(db);

    const afterE4 = dangers.find((d) => d.fen === AFTER_E4);
    expect(afterE4).toMatchObject({ reached: 2, seriousErrors: 0, proportion: 0 });
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

    // Of the 9 distinct FENs the 12 Position-instances (6 plies × 2 Games)
    // collapse to, only the pre-/post-Nc3 Positions the two move orders
    // transpose into recur. The in-between singletons are not Danger positions,
    // and the initial Position is excluded whatever its reach count.
    expect(dangers).toHaveLength(2);
    expect(dangers.every((d) => d.reached === 2)).toBe(true);
  });

  it("counts a serious error within the next 10 half-moves, but not the 11th", () => {
    const db = tempDb();
    // Both Games follow the same 16-ply line, so they share the probe Position
    // (ply 2, after 1. e4 e5) — the initial Position is no longer returned.
    const RUY_LOPEZ = "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O";
    const ALL_PLIES = [...Array(17).keys()];

    // White blunders on the move from ply 10 to ply 11 — the 9th half-move
    // ahead of the probe, still inside its 10-half-move look-ahead window.
    const within = seedGame(db, { pgn: RUY_LOPEZ, playerColor: "white" });
    for (const ply of ALL_PLIES) {
      // Black-relative at ply 11: White is now losing badly.
      seedEvaluation(db, within.id, ply, { cp: ply === 11 ? 1000 : 0 });
    }

    // Same blunder, two half-moves later (ply 12→13) — one Move past the window.
    const outside = seedGame(db, { pgn: RUY_LOPEZ, playerColor: "white" });
    for (const ply of ALL_PLIES) {
      seedEvaluation(db, outside.id, ply, { cp: ply === 13 ? 1000 : 0 });
    }

    const dangers = getDangerPositions(db);

    const probe = dangers.find((d) => d.fen === AFTER_E4_E5)!;
    expect(probe).toMatchObject({ reached: 2, seriousErrors: 1, proportion: 0.5 });
  });

  it("keeps only recurring Positions — one reached a single time is not a Danger position", () => {
    const db = tempDb();
    // Both open 1. e4; they diverge on Black's reply, so only the Position
    // after 1. e4 (and the start) is reached twice.
    const g1 = seedGame(db, { pgn: "1. e4 e5" });
    const g2 = seedGame(db, { pgn: "1. e4 d5" });
    for (const ply of [0, 1, 2]) {
      seedEvaluation(db, g1.id, ply, { cp: 0 });
      seedEvaluation(db, g2.id, ply, { cp: 0 });
    }

    const dangers = getDangerPositions(db);

    expect(dangers.every((d) => d.reached >= 2)).toBe(true);
  });

  it("never returns the initial Position — it is not somewhere the Player arrives", () => {
    const db = tempDb();
    for (let n = 0; n < 2; n++) {
      const game = seedGame(db, { pgn: "1. e4 e5" });
      for (const ply of [0, 1, 2]) seedEvaluation(db, game.id, ply, { cp: 0 });
    }

    const dangers = getDangerPositions(db);

    // Reached by every Game by construction, so it would otherwise top the list.
    expect(dangers.find((d) => d.fen === START_FEN)).toBeUndefined();
    expect(dangers.length).toBeGreaterThan(0);
  });

  it("ranks the most dangerous Position first, not the most often reached", () => {
    const db = tempDb();
    // Three Games open 1. d4 quietly; two open 1. e4 and blunder right after.
    // The 1. d4 Position is reached more often, the 1. e4 one is more dangerous.
    for (let n = 0; n < 3; n++) {
      const quiet = seedGame(db, { pgn: "1. d4 d5", playerColor: "white" });
      for (const ply of [0, 1, 2]) seedEvaluation(db, quiet.id, ply, { cp: 0 });
    }
    for (let n = 0; n < 2; n++) {
      const sharp = seedGame(db, { pgn: "1. e4 e5", playerColor: "black" });
      for (const ply of [0, 1, 2]) seedEvaluation(db, sharp.id, ply, { cp: ply === 2 ? 1000 : 0 });
    }

    const dangers = getDangerPositions(db);

    expect(dangers[0]).toMatchObject({ fen: AFTER_E4, reached: 2, proportion: 1 });
    expect(dangers.map((d) => d.proportion)).toEqual(
      [...dangers.map((d) => d.proportion)].sort((a, b) => b - a),
    );
  });

  it("breaks a proportion tie on the reach count", () => {
    const db = tempDb();
    // Same 0% proportion everywhere; 1. e4 is reached twice, 1. d4 once… so
    // only 1. e4 survives the floor. Give 1. d4 three Games to outrank it.
    for (let n = 0; n < 2; n++) {
      const g = seedGame(db, { pgn: "1. e4 e5" });
      for (const ply of [0, 1, 2]) seedEvaluation(db, g.id, ply, { cp: 0 });
    }
    for (let n = 0; n < 3; n++) {
      const g = seedGame(db, { pgn: "1. d4 d5" });
      for (const ply of [0, 1, 2]) seedEvaluation(db, g.id, ply, { cp: 0 });
    }

    const dangers = getDangerPositions(db);

    expect(dangers.every((d) => d.proportion === 0)).toBe(true);
    expect(dangers.map((d) => d.reached)).toEqual([...dangers.map((d) => d.reached)].sort((a, b) => b - a));
    expect(dangers[0].reached).toBe(3);
  });

  it("ignores Games that have not been analyzed", () => {
    const db = tempDb();
    seedGame(db, { pgn: "1. e4", analyzed: false });

    const dangers = getDangerPositions(db);

    expect(dangers).toEqual([]);
  });
});
