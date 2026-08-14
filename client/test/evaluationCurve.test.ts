import { describe, it, expect } from "vitest";
import { evaluationCurve } from "../src/chess/evaluationCurve";
import type { MoveAnnotation } from "../src/types";

function ply(ply: number, whiteWinChances: number): MoveAnnotation {
  return { ply, whiteEval: { cp: 0, mate: null }, whiteWinChances, severity: null };
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
