import { describe, it, expect } from "vitest";
import { timeTrace, niceCeilingCs } from "../src/chess/timeTrace";
import type { PlyTime } from "../src/types";

/**
 * The geometry of the « Temps par coup » drawing. Pure, so the picture's shape
 * is argued here rather than eyeballed on screen.
 *
 * The Player's Moves are drawn **upward** and the opponent's **downward** from a
 * shared axis: the side is carried by **position**, never by colour alone
 * (ADR-0013). Both halves share one ceiling, or the two would not be comparable
 * — which is the only thing the picture is for.
 */
const ply = (n: number, spentCs: number | null): PlyTime => ({
  ply: n,
  clockCs: null,
  spentCs,
  // The drawing does not read the share; it is stated so the fixture is a real
  // `PlyTime` rather than a partial one the type happens to tolerate.
  shareOfRemaining: null,
});

describe("timeTrace", () => {
  // White is the Player here; ply 1 is White's first Move.
  const plies = [ply(0, null), ply(1, 200), ply(2, 800), ply(3, 1_200), ply(4, 300)];

  it("draws the Player's Moves up and the opponent's down", () => {
    const { bars } = timeTrace(plies, "white");

    expect(bars.map((b) => [b.ply, b.mine])).toEqual([
      [1, true],
      [2, false],
      [3, true],
      [4, false],
    ]);
  });

  it("follows the Player onto the Black side", () => {
    // The Player is not a colour: on a Black Game the even plies are theirs.
    const { bars } = timeTrace(plies, "black");

    expect(bars.filter((b) => b.mine).map((b) => b.ply)).toEqual([2, 4]);
  });

  it("shares one ceiling across both halves, so the two are comparable", () => {
    const { ceilingCs } = timeTrace(plies, "white");

    // The longest Move of the Game is 12 s, whoever played it — a ceiling per
    // side would make a 12 s think look like a 2 s one.
    expect(ceilingCs).toBeGreaterThanOrEqual(1_200);
  });

  it("gives each bar a height as a share of that ceiling", () => {
    const { bars, ceilingCs } = timeTrace(plies, "white");
    const longest = bars.find((b) => b.ply === 3)!;

    expect(longest.height).toBeCloseTo((1_200 / ceilingCs) * 100, 5);
  });

  it("skips a Move with no figure rather than drawing it at zero", () => {
    // A bar of height 0 reads as "played instantly", which is a measurement.
    // An underivable time is not one, so nothing is drawn (SPEC US-18).
    const { bars } = timeTrace([ply(0, null), ply(1, null), ply(2, 500)], "white");

    expect(bars.map((b) => b.ply)).toEqual([2]);
  });

  it("draws nothing at all when no Move carries a figure", () => {
    const { bars, ceilingCs } = timeTrace([ply(0, null), ply(1, null)], "white");

    expect(bars).toEqual([]);
    // No ceiling to speak of, and no division by zero downstream.
    expect(ceilingCs).toBe(0);
  });

  it("prints a scale in seconds, so a height is never read without a number", () => {
    // The licence for an `aria-hidden` drawing is that its figures exist in text
    // (the precedent DriftGraph sets). The scale is half of that.
    const { ticks } = timeTrace(plies, "white");

    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick.label).toMatch(/s$/);
      expect(tick.y).toBeGreaterThanOrEqual(0);
      expect(tick.y).toBeLessThanOrEqual(100);
    }
  });

  it("keeps the x axis the Game's own plies, so it lines up with the other drawings", () => {
    // The curve and the drift share this axis; a third picture on a different one
    // could not be compared by looking down.
    expect(timeTrace(plies, "white").lastX).toBe(4);
  });
});

describe("niceCeilingCs", () => {
  it("rounds up to a figure a person would choose", () => {
    // A 1–2–5 sequence, which is what a person actually draws an axis on.
    expect(niceCeilingCs(1_200)).toBe(2_000); // 12 s → 20 s
    expect(niceCeilingCs(4_300)).toBe(5_000); // 43 s → 50 s
    expect(niceCeilingCs(1_800)).toBe(2_000); // 18 s → 20 s
    expect(niceCeilingCs(30)).toBe(100); // 0.3 s → 1 s, never below a second
  });

  it("never returns zero, so nothing divides by it", () => {
    expect(niceCeilingCs(0)).toBeGreaterThan(0);
  });
});
