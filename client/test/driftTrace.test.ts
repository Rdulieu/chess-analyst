import { describe, it, expect } from "vitest";
import { driftTrace } from "../src/chess/driftTrace";
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
