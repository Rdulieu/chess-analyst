import { describe, it, expect } from "vitest";
import { candidateArrows } from "../src/chess/arrows";
import type { MoveHabitCandidate } from "../src/types";

function cand(san: string, count: number, winRate: number): MoveHabitCandidate {
  return {
    san,
    count,
    win: 0,
    draw: 0,
    loss: 0,
    winRate,
    byCategory: { bullet: 0, blitz: count, rapid: 0, classical: 0, correspondence: 0 },
  };
}

describe("candidateArrows", () => {
  it("maps each candidate to an arrow from the moving piece's square to its target", () => {
    const arrows = candidateArrows([], [cand("e4", 3, 0.6), cand("d4", 1, 0.4)]);

    const e4 = arrows.find((a) => a.san === "e4")!;
    expect(e4.startSquare).toBe("e2");
    expect(e4.endSquare).toBe("e4");

    const d4 = arrows.find((a) => a.san === "d4")!;
    expect([d4.startSquare, d4.endSquare]).toEqual(["d2", "d4"]);
  });

  it("draws arrows for candidates from a Position reached by replaying the path", () => {
    // After 1. e4 it is Black to move: the reply 1...e5 runs e7 → e5.
    const [e5] = candidateArrows(["e4"], [cand("e5", 2, 0.5)]);
    expect([e5.startSquare, e5.endSquare]).toEqual(["e7", "e5"]);
  });

  it("colours by win rate: the hue differs across the 50% threshold", () => {
    const [winning, losing] = candidateArrows([], [cand("e4", 3, 0.8), cand("d4", 3, 0.2)]);
    // Same frequency (same alpha), different win rate → different colour.
    expect(winning.color).not.toBe(losing.color);
  });

  it("fades by frequency: a more-played candidate is more opaque than a rare one", () => {
    const [frequent, rare] = candidateArrows([], [cand("e4", 4, 0.5), cand("d4", 1, 0.5)]);
    // Same win rate (same hue), different frequency → different colour (alpha).
    expect(frequent.color).not.toBe(rare.color);
  });
});
