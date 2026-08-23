import { describe, it, expect } from "vitest";
import { gameAnnotations, gamePlies } from "../src/analysis/derivation";
import { gamePositions } from "../src/chess/positions";
import { fixtureBestLine } from "../src/engine/fixture";

/** Stamps each stored `Evaluation` with the FEN of the Position it is of — what
 *  the `Analysis pass` writes (ADR-0012). Irrelevant to the annotations
 *  themselves, but a stored row always carries one. */
function stored<T extends { ply: number }>(pgn: string, evals: T[]) {
  const fens = gamePositions(pgn);
  // A stored Evaluation always carries its `Best line` (ADR-0016), and the
  // fixture's is playable from the Position it belongs to.
  return evals.map((e) => ({ ...e, fen: fens[e.ply], pv: fixtureBestLine(fens[e.ply]).join(" ") }));
}

describe("gamePlies", () => {
  it("reads the FEN stored with each Evaluation instead of replaying the PGN", () => {
    // Deliberately not the FENs of any real Game: if the derivation replayed a
    // PGN it would produce something else entirely (ADR-0012).
    const evals = [
      { ply: 1, fen: "second", cp: 10, mate: null, pv: "" },
      { ply: 0, fen: "first", cp: 25, mate: null, pv: "" },
    ];

    const plies = gamePlies(evals);

    expect(plies.map((p) => p.fen)).toEqual(["first", "second"]);
  });
});

describe("gameAnnotations", () => {
  it("ply 0 (starting Position, White to move) keeps the stored Evaluation as-is", () => {
    const game = { pgn: "1. e4 e5", playerColor: "white" as const };
    const evals = stored(game.pgn, [
      { ply: 0, cp: 25, mate: null },
      { ply: 1, cp: -10, mate: null },
      { ply: 2, cp: 5, mate: null },
    ]);

    const annotations = gameAnnotations(game, evals);

    expect(annotations[0]).toMatchObject({ ply: 0, whiteEval: { cp: 25, mate: null }, severity: null });
  });

  it("whiteEval is a clean {cp, mate} pair, never leaking the stored row's other fields", () => {
    const game = { pgn: "1. e4", playerColor: "white" as const };
    // A DB-select row carries more than {cp, mate} (e.g. gameId, ply) — the
    // White-to-move branch must not return it as-is.
    const evals = stored(game.pgn, [
      { ply: 0, cp: 25, mate: null, gameId: 1 },
      { ply: 1, cp: 0, mate: null, gameId: 1 },
    ]);

    const annotations = gameAnnotations(game, evals);

    expect(annotations[0].whiteEval).toEqual({ cp: 25, mate: null });
  });

  it("ply 1 (Black to move, after White's Move) flips the stored Evaluation to stay White-relative", () => {
    const game = { pgn: "1. e4 e5", playerColor: "white" as const };
    const evals = stored(game.pgn, [
      { ply: 0, cp: 25, mate: null },
      { ply: 1, cp: -10, mate: null }, // side-to-move (Black) relative: Black is 10cp worse off.
      { ply: 2, cp: 5, mate: null },
    ]);

    const annotations = gameAnnotations(game, evals);

    // Black 10cp worse off means White is 10cp better off — White-relative must be +10.
    expect(annotations[1]).toMatchObject({ ply: 1, whiteEval: { cp: 10, mate: null } });
  });

  it("flags the Player's own Move with its severity (winning-chances drop, as /danger already classifies it)", () => {
    const game = { pgn: "1. e4 e5", playerColor: "white" as const };
    const evals = stored(game.pgn, [
      { ply: 0, cp: 0, mate: null }, // White to move, 50% win chances.
      { ply: 1, cp: null, mate: 3 }, // Black to move, forced mate: White's Move just blundered into it.
      { ply: 2, cp: 0, mate: null },
    ]);

    const annotations = gameAnnotations(game, evals);

    expect(annotations[1].severity).toBe("blunder");
  });

  it("never flags the opponent's Move, even when it drops winning chances just as badly", () => {
    const game = { pgn: "1. e4 e5 2. Nf3", playerColor: "white" as const };
    const evals = stored(game.pgn, [
      { ply: 0, cp: 0, mate: null }, // White to move.
      { ply: 1, cp: 0, mate: null }, // Black to move.
      { ply: 2, cp: null, mate: 3 }, // White to move: Black's Move just blundered into a mate.
      { ply: 3, cp: 0, mate: null },
    ]);

    const annotations = gameAnnotations(game, evals);

    expect(annotations[2].severity).toBeNull();
  });

  it("flips a forced mate to White-relative exactly like it flips cp", () => {
    const game = { pgn: "1. e4 e5", playerColor: "white" as const };
    const evals = stored(game.pgn, [
      { ply: 0, cp: 0, mate: null },
      { ply: 1, cp: null, mate: 3 }, // Black to move: Black has a forced mate in 3 (bad for White).
      { ply: 2, cp: 0, mate: null },
    ]);

    const annotations = gameAnnotations(game, evals);

    expect(annotations[1].whiteEval).toEqual({ cp: null, mate: -3 });
  });
});

describe("gameAnnotations — the Phase of each Move", () => {
  it("names the Phase of every Move, derived from the FEN already stored with it", () => {
    const game = { pgn: "1. e4 e5", playerColor: "white" as const };
    const evals = stored(game.pgn, [
      { ply: 0, cp: 25, mate: null },
      { ply: 1, cp: -10, mate: null },
      { ply: 2, cp: 5, mate: null },
    ]);

    const annotations = gameAnnotations(game, evals);

    // No new column and no engine call: the Phase rides on what US-4 already wrote.
    expect(annotations.map((a) => a.phase)).toEqual(["early", "early", "early"]);
  });

  it("reads the Phase in the Game's own sequence, so it latches across the Moves", () => {
    // Two Positions: an Endgame, then one that alone would read as a Middlegame.
    const evals = [
      { ply: 0, fen: "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w - - 0 20", cp: 0, mate: null, pv: "" },
      { ply: 1, fen: "r2qk2r/pppppppp/2n5/8/8/8/PPPPPPPP/R2QK2R b - - 0 20", cp: 0, mate: null, pv: "" },
    ];

    const annotations = gameAnnotations({ playerColor: "white" }, evals);

    expect(annotations.map((a) => a.phase)).toEqual(["endgame", "endgame"]);
  });
});

describe("gameAnnotations — whether a Move counts", () => {
  it("says of each of the Player's Moves whether it counts, and asserts nothing about the opponent's", () => {
    const game = { pgn: "1. e4 e5 2. Nf3", playerColor: "white" as const };
    const evals = stored(game.pgn, [
      { ply: 0, cp: 25, mate: null },
      { ply: 1, cp: -10, mate: null },
      { ply: 2, cp: 5, mate: null },
      { ply: 3, cp: 0, mate: null },
    ]);

    const annotations = gameAnnotations(game, evals);

    expect(annotations.map((a) => a.counted)).toEqual([
      null, // the starting Position is no Move
      { counted: true, reason: null },
      null, // Black's
      { counted: true, reason: null },
    ]);
  });
})
