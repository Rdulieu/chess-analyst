import { describe, it, expect } from "vitest";
import { gameAnnotations } from "../src/analysis/derivation";

describe("gameAnnotations", () => {
  it("ply 0 (starting Position, White to move) keeps the stored Evaluation as-is", () => {
    const game = { pgn: "1. e4 e5", playerColor: "white" as const };
    const evals = [
      { ply: 0, cp: 25, mate: null },
      { ply: 1, cp: -10, mate: null },
      { ply: 2, cp: 5, mate: null },
    ];

    const annotations = gameAnnotations(game, evals);

    expect(annotations[0]).toMatchObject({ ply: 0, whiteEval: { cp: 25, mate: null }, severity: null });
  });

  it("ply 1 (Black to move, after White's Move) flips the stored Evaluation to stay White-relative", () => {
    const game = { pgn: "1. e4 e5", playerColor: "white" as const };
    const evals = [
      { ply: 0, cp: 25, mate: null },
      { ply: 1, cp: -10, mate: null }, // side-to-move (Black) relative: Black is 10cp worse off.
      { ply: 2, cp: 5, mate: null },
    ];

    const annotations = gameAnnotations(game, evals);

    // Black 10cp worse off means White is 10cp better off — White-relative must be +10.
    expect(annotations[1]).toMatchObject({ ply: 1, whiteEval: { cp: 10, mate: null } });
  });

  it("flags the Player's own Move with its severity (winning-chances drop, as /danger already classifies it)", () => {
    const game = { pgn: "1. e4 e5", playerColor: "white" as const };
    const evals = [
      { ply: 0, cp: 0, mate: null }, // White to move, 50% win chances.
      { ply: 1, cp: null, mate: 3 }, // Black to move, forced mate: White's Move just blundered into it.
      { ply: 2, cp: 0, mate: null },
    ];

    const annotations = gameAnnotations(game, evals);

    expect(annotations[1].severity).toBe("blunder");
  });

  it("never flags the opponent's Move, even when it drops winning chances just as badly", () => {
    const game = { pgn: "1. e4 e5 2. Nf3", playerColor: "white" as const };
    const evals = [
      { ply: 0, cp: 0, mate: null }, // White to move.
      { ply: 1, cp: 0, mate: null }, // Black to move.
      { ply: 2, cp: null, mate: 3 }, // White to move: Black's Move just blundered into a mate.
      { ply: 3, cp: 0, mate: null },
    ];

    const annotations = gameAnnotations(game, evals);

    expect(annotations[2].severity).toBeNull();
  });

  it("flips a forced mate to White-relative exactly like it flips cp", () => {
    const game = { pgn: "1. e4 e5", playerColor: "white" as const };
    const evals = [
      { ply: 0, cp: 0, mate: null },
      { ply: 1, cp: null, mate: 3 }, // Black to move: Black has a forced mate in 3 (bad for White).
      { ply: 2, cp: 0, mate: null },
    ];

    const annotations = gameAnnotations(game, evals);

    expect(annotations[1].whiteEval).toEqual({ cp: null, mate: -3 });
  });
});
