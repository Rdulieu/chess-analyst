import { describe, it, expect } from "vitest";
import { gameRecap } from "../src/analysis/recap";
import { gamePositions } from "../src/chess/positions";
import type { StoredEvaluation } from "../src/analysis/derivation";

/**
 * Stored rows for a Game whose Positions come from its own PGN, with the
 * winning chances driven by the centipawn scores. `cp` is side-to-move relative,
 * as stored.
 */
function stored(pgn: string, cps: number[]): StoredEvaluation[] {
  const fens = gamePositions(pgn);
  return cps.map((cp, ply) => ({ ply, fen: fens[ply], cp, mate: null, pv: "" }));
}

/** A Game long enough to hold a few Moves of each side. */
const PGN = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 d6";
const REGIME = { depth: 16, lines: 2 };

describe("gameRecap — what this Game contributes", () => {
  it("is ONE function: the aggregate will fold exactly this, not a second implementation of it", () => {
    // The reconciliation of ADR-0017 is a definition, not a test we hope passes,
    // so the recap has to be a value a caller can sum — not a rendering.
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), REGIME);

    expect(Object.keys(recap).sort()).toEqual(
      [
        "chancesLost",
        "countedErrors",
        "countedMoves",
        "drift",
        "excluded",
        "flaggedLoss",
        "flaggedMoves",
        "flaggedUncounted",
        "playerMoves",
        "regime",
      ].sort(),
    );
  });

  it("breaks the gap between shown and counted down BY REASON, never as one figure", () => {
    // The one overlap the two sets have: a sole legal Move that is also a
    // catastrophe. White is in check from the rook on g1 and boxed in by their
    // own pawns, so `Kxg1` is the ONLY legal Move — and here it walks into a
    // collapse. Flagged by the Game, held against nobody.
    // Positions are written out rather than replayed from a PGN: the point is
    // the Position's shape, and a PGN reaching it would only obscure that.
    const SOLE_LEGAL = "7k/8/8/8/8/8/5PPP/6rK w - - 0 1";
    const AFTER = "7k/8/8/8/8/8/5PPP/6K1 b - - 0 1";
    const evals: StoredEvaluation[] = [
      { ply: 0, fen: SOLE_LEGAL, cp: 120, mate: null, pv: "" },
      { ply: 1, fen: AFTER, cp: 900, mate: null, pv: "" },
    ];

    const recap = gameRecap({ playerColor: "white" }, evals, REGIME);

    // The Move is shown and not counted, and the panel is told WHY.
    expect(recap.flaggedMoves).toBe(1);
    expect(recap.countedErrors).toBe(0);
    expect(recap.flaggedUncounted).toEqual({ forced: 1, decided: 0 });
    // The invariant the recap owes its reader: the breakdown IS the gap.
    const { forced, decided } = recap.flaggedUncounted;
    expect(forced + decided).toBe(recap.flaggedMoves - recap.countedErrors);
  });

  it("leaves the breakdown at zero when every flagged Move is counted", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), REGIME);

    expect(recap.flaggedUncounted).toEqual({ forced: 0, decided: 0 });
    expect(recap.flaggedMoves).toBe(recap.countedErrors);
  });

  it("counts the Player's Moves, not the Game's half-moves", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), REGIME);

    // Eight half-moves, four of them White's.
    expect(recap.playerMoves).toBe(4);
    expect(recap.countedMoves).toBe(4);
    expect(recap.excluded).toEqual({ forced: 0, decided: 0 });
  });

  it("adds up: what the flagged Moves lost, plus the Drift, IS everything lost", () => {
    // A Game with one real Blunder and a slow bleed around it.
    const recap = gameRecap(
      { playerColor: "white" },
      stored(PGN, [30, -20, 10, -40, -300, 280, -320, 300, -340]),
      REGIME,
    );

    expect(recap.flaggedLoss + recap.drift).toBeCloseTo(recap.chancesLost, 10);
    expect(recap.drift).toBeGreaterThanOrEqual(0);
  });

  it("gives the whole of what was lost to the Drift when no Move is flagged", () => {
    // Five centipawns a Move: never trips the Inaccuracy floor, and that is
    // exactly what a threshold reading is blind to.
    const recap = gameRecap(
      { playerColor: "white" },
      stored(PGN, [20, -15, 10, -5, 0, 5, -10, 15, -20]),
      REGIME,
    );

    expect(recap.countedErrors).toBe(0);
    expect(recap.drift).toBeCloseTo(recap.chancesLost, 10);
    expect(recap.chancesLost).toBeGreaterThan(0);
  });

  it("reads all zeros on a Game with nothing lost — no special case, no doubtful division", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), REGIME);

    expect(recap.chancesLost).toBe(0);
    expect(recap.flaggedLoss).toBe(0);
    expect(recap.drift).toBe(0);
    expect(recap.countedErrors).toBe(0);
  });

  it("carries the Search regime once for the Game, since a Game never mixes two", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), REGIME);

    expect(recap.regime).toEqual(REGIME);
  });

  it("says a Game with no analysis pass behind it has an unknown regime rather than today's", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), null);

    expect(recap.regime).toBeNull();
  });
});

describe("gameRecap — flagged is not the same as counted, and the gap is the point", () => {
  it("counts a flagged Move that does not count in flaggedMoves but NOT in countedErrors", () => {
    // The Position before White's Move offers exactly one legal reply, and the
    // reply is catastrophic: flagged by the Game, held against nobody.
    const fen = "7k/8/8/8/8/8/5PPP/6rK w - - 0 1";
    const evals: StoredEvaluation[] = [
      { ply: 0, fen, cp: 300, mate: null, pv: "" },
      { ply: 1, fen: "7k/8/8/8/8/8/5PPP/6K1 b - - 0 1", cp: 900, mate: null, pv: "" },
    ];

    const recap = gameRecap({ playerColor: "white" }, evals, REGIME);

    expect(recap.flaggedMoves).toBe(1);
    expect(recap.countedErrors).toBe(0);
    expect(recap.excluded).toEqual({ forced: 1, decided: 0 });
    // ...and an excluded Move contributes none of its loss either, so the two
    // parts still add up over what IS counted.
    expect(recap.flaggedLoss + recap.drift).toBeCloseTo(recap.chancesLost, 10);
  });
});

describe("gameRecap — the recap IS the sum of what the Moves carry", () => {
  it("equals the per-Move figures served with the annotations, on a Game with real losses", async () => {
    const { gameAnnotations } = await import("../src/analysis/derivation");
    const evals = stored(PGN, [30, -20, 10, -40, -300, 280, -320, 300, -340]);
    const game = { playerColor: "white" as const };

    const recap = gameRecap(game, evals, REGIME);
    const carried = gameAnnotations(game, evals)
      .map((a) => a.chancesLost ?? 0)
      .reduce((sum, lost) => sum + lost, 0);

    // Not "close enough": the aggregate is this sum, so it is the same number or
    // the reconciliation ADR-0017 rests on is already broken at one Game.
    expect(carried).toBe(recap.chancesLost);
  });
});
