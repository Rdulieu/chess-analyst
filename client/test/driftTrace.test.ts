import { describe, it, expect } from "vitest";
import { driftScale, driftTrace } from "../src/chess/driftTrace";
import { phaseBands } from "../src/chess/phaseBands";
import type { MoveAnnotation } from "../src/types";

const move = (
  chancesLost: number | null,
  phase: MoveAnnotation["phase"] = "middlegame",
): MoveAnnotation => ({
  ply: 0,
  whiteEval: { cp: 0, mate: null },
  whiteWinChances: 50,
  severity: null,
  bestLine: [],
  phase,
  counted: chancesLost === null ? null : { counted: true, reason: null },
  chancesLost,
});

describe("The cumulative trace of what the Player lost", () => {
  it("only ever climbs: it is a cumulative total, so it cannot go back down", () => {
    const trace = driftTrace([move(null), move(4), move(null), move(0), move(12)]);

    expect(trace.points.map((p) => p.lost)).toEqual([0, 4, 4, 4, 16]);
  });

  it("makes a flagged Move a STEP and a bleed a SLOPE — the same picture, two shapes", () => {
    const step = driftTrace([move(null), move(0), move(30), move(0)]);
    const slope = driftTrace([move(null), move(5), move(5), move(5)]);

    // One Move carries the whole climb...
    expect(step.points.map((p) => p.lost)).toEqual([0, 0, 30, 30]);
    // ...against the same total spread evenly, which no threshold ever flags.
    expect(slope.points.map((p) => p.lost)).toEqual([0, 5, 10, 15]);
    expect(slope.total).toBe(15);
  });

  it("shares the curve's x axis: one point per ply, same indices", () => {
    const annotations = [move(null), move(1), move(null), move(2)];

    const trace = driftTrace(annotations);

    expect(trace.points.map((p) => p.x)).toEqual([0, 1, 2, 3]);
    expect(trace.lastX).toBe(3);
  });

  it("reads flat at zero on a Game that lost nothing, with no special case", () => {
    const trace = driftTrace([move(null), move(0), move(null)]);

    expect(trace.total).toBe(0);
    expect(trace.points.every((p) => p.lost === 0)).toBe(true);
  });

  it("has no points at all for a Game with no annotations, rather than a degenerate one", () => {
    expect(driftTrace([]).points).toEqual([]);
  });
});

describe("The Phase bands both drawings share", () => {
  const game = (...phases: MoveAnnotation["phase"][]) => phases.map((p) => move(0, p));

  it("names one band per Phase, in order, with the plies it spans", () => {
    const bands = phaseBands(game("early", "early", "middlegame", "middlegame", "endgame"));

    expect(bands).toEqual([
      { phase: "early", from: 0, to: 2 },
      { phase: "middlegame", from: 2, to: 4 },
      { phase: "endgame", from: 4, to: 4 },
    ]);
  });

  it("gives a Game that never leaves the start a single band and no boundary", () => {
    const bands = phaseBands(game("early", "early", "early"));

    expect(bands).toEqual([{ phase: "early", from: 0, to: 2 }]);
    expect(bands.slice(1).map((b) => b.from)).toEqual([]);
  });

  it("has no band at all with nothing to draw", () => {
    expect(phaseBands([])).toEqual([]);
  });
});

describe("The scale the trace is drawn against", () => {
  it("gives a Game that lost little a box worth a WHOLE Game, so the trace stays low in it", () => {
    const scale = driftScale(5);

    // The ceiling is not the Game's total: at `ceiling = total` every trace ends
    // at the top of its box and the eye reads "height = gravity", which is false.
    expect(scale.ceiling).toBe(100);
  });

  it("raises the ceiling to the total past a whole Game, so nothing is ever clipped", () => {
    // The catastrophic Games are exactly the ones this story wants to look at: a
    // clipped trace would lie about them precisely.
    expect(driftScale(191).ceiling).toBe(191);
  });

  it("keeps the whole-Game rule INSIDE the frame on the common case, a Game under 100 %", () => {
    // Under a whole Game the rule sits at the very top of the box: the box IS one
    // Game's worth. Without the raised ceiling it would fall out of frame on every
    // such Game — that is, on most of them.
    expect(driftScale(57).hundred).toBe(0);
  });

  it("drops the rule DOWN the box as the Game gets worse, which is what makes it a ruler", () => {
    // 191 % lost: the trace fills the box and the rule lands at 100/191 of the
    // height. Two Games are then compared by where the rule sits — a mark of
    // constant meaning in a box of constant size.
    expect(driftScale(191).hundred).toBeCloseTo(47.6, 1);
    expect(driftScale(200).hundred).toBe(50);
  });

  it("graduates the box in figures, each at its own height — the reader gets numbers, not a shape", () => {
    const scale = driftScale(57);

    // 100 itself is NOT a gradation: it is the rule, and the rule carries its own
    // label, so the two would print the same figure twice at the same height.
    expect(scale.ticks).toEqual([
      { value: 0, y: 100 },
      { value: 50, y: 50 },
    ]);
  });

  it("coarsens its step on a catastrophic Game rather than printing a wall of figures", () => {
    // A 6rem box prints four or five figures legibly, not twenty.
    expect(driftScale(1000).ticks.map((t) => t.value)).toEqual([0, 250, 500, 750, 1000]);
    // And the step stays a round share of a whole Game, at every scale.
    expect(driftScale(380).ticks.map((t) => t.value)).toEqual([0, 200, 300]);
  });

  it("puts every gradation and the rule INSIDE the box, whatever the Game did", () => {
    for (const total of [0, 5, 57, 100, 100.4, 191, 1000]) {
      const scale = driftScale(total);

      expect(scale.hundred).toBeGreaterThanOrEqual(0);
      expect(scale.hundred).toBeLessThanOrEqual(100);
      for (const tick of scale.ticks) {
        expect(tick.y).toBeGreaterThanOrEqual(0);
        expect(tick.y).toBeLessThanOrEqual(100);
      }
    }
  });
});
