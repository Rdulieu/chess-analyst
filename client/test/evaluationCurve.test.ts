import { describe, it, expect } from "vitest";
import { evaluationCurve, errorTally } from "../src/chess/evaluationCurve";
import type { MoveAnnotation } from "../src/types";

function ply(
  ply: number,
  whiteWinChances: number,
  severity: MoveAnnotation["severity"] = null,
): MoveAnnotation {
  return { ply, whiteEval: { cp: 0, mate: null }, whiteWinChances, severity, bestLine: [], phase: "early", counted: null, chancesLost: null };
}

describe("evaluationCurve", () => {
  it("plots one point per Move, the starting Position leftmost, height being White's winning chances", () => {
    const curve = evaluationCurve([ply(0, 50), ply(1, 55), ply(2, 31)]);

    expect(curve.points).toEqual([
      { x: 0, whiteShare: 50 },
      { x: 1, whiteShare: 55 },
      { x: 2, whiteShare: 31 },
    ]);
    expect(curve.lastX).toBe(2);
  });

  it("plots nothing for a Game with no Evaluations, so a caller has nothing to draw", () => {
    expect(evaluationCurve([]).points).toEqual([]);
  });

  it("gives a mating side the whole height, needing no threshold of its own", () => {
    const curve = evaluationCurve([ply(0, 50), ply(1, 100), ply(2, 0)]);

    expect(curve.points[1].whiteShare).toBe(100);
    expect(curve.points[2].whiteShare).toBe(0);
  });
});

describe("the Player's flawed Moves on the curve", () => {
  it("marks each flawed Move at its own point, carrying its severity", () => {
    const curve = evaluationCurve([
      ply(0, 50),
      ply(1, 40, "inaccuracy"),
      ply(2, 45),
      ply(3, 12, "blunder"),
    ]);

    expect(curve.markers).toEqual([
      { x: 1, whiteShare: 40, severity: "inaccuracy" },
      { x: 3, whiteShare: 12, severity: "blunder" },
    ]);
  });

  it("marks nothing on the starting Position, nor on a Move the Player did not play", () => {
    // The opponent's Moves arrive with no severity at all (a domain decision,
    // CONTEXT.md), however sharply they moved the winning chances.
    const curve = evaluationCurve([ply(0, 50), ply(1, 5), ply(2, 60)]);

    expect(curve.markers).toEqual([]);
  });
});

describe("errorTally", () => {
  it("counts the Player's flawed Moves under each severity", () => {
    const tally = errorTally([
      ply(0, 50),
      ply(1, 40, "inaccuracy"),
      ply(2, 45),
      ply(3, 20, "mistake"),
      ply(4, 30, "inaccuracy"),
      ply(5, 5, "blunder"),
    ]);

    expect(tally).toEqual({ inaccuracy: 2, mistake: 1, blunder: 1, total: 4 });
  });

  it("counts zero for a Game the Player played without a flaw", () => {
    expect(errorTally([ply(0, 50), ply(1, 52)])).toEqual({
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      total: 0,
    });
  });
});
