import { describe, it, expect } from "vitest";
import { biasOf, type ConfusionMatrix } from "../src/features/confrontation/bias";

/** A matrix with every cell present, overlaid with the cells a test cares about. */
function matrix(cells: Record<string, Record<string, number>>): ConfusionMatrix {
  const empty = Object.fromEntries(
    ["blunder", "mistake", "inaccuracy", "sound", "good"].map((d) => [
      d,
      { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
    ]),
  ) as ConfusionMatrix;
  for (const [declared, row] of Object.entries(cells)) {
    Object.assign(empty[declared as keyof ConfusionMatrix], row);
  }
  return empty;
}

describe("the direction of the bias — the fact the matrix already holds", () => {
  it("says the Player over-reads danger when their verdicts sit above the engine's", () => {
    // Calling a Mistake a Blunder, and a sound Move an Inaccuracy: seeing danger
    // that is not there. One of the two opposite faults of analysis, and none of
    // the three figures separates them alone.
    const bias = biasOf(
      matrix({ blunder: { mistake: 3 }, inaccuracy: { none: 2 } }),
    );

    expect(bias).toMatchObject({ direction: "over", over: 5, under: 0 });
  });

  it("says the Player under-reads danger when their verdicts sit below the engine's", () => {
    const bias = biasOf(matrix({ sound: { blunder: 2 }, inaccuracy: { mistake: 2 } }));

    expect(bias).toMatchObject({ direction: "under", over: 0, under: 4 });
  });

  it("counts an agreement as neither, whichever band it is on", () => {
    const bias = biasOf(matrix({ mistake: { mistake: 6 }, sound: { none: 9 } }));

    expect(bias).toMatchObject({ over: 0, under: 0 });
  });

  it("ignores the Good row entirely — the engine has no band to disagree with", () => {
    // A `Good` on a Move the engine flagged is not the Player over- or
    // under-reading danger: it is a verdict with nothing on the other side.
    const bias = biasOf(matrix({ good: { blunder: 4, none: 4 } }));

    expect(bias).toMatchObject({ over: 0, under: 0, direction: null });
  });

  it("draws no direction when the divergences do not lean", () => {
    const bias = biasOf(matrix({ blunder: { mistake: 3 }, sound: { mistake: 3 } }));

    expect(bias.direction).toBeNull();
  });

  it("draws no direction from too few divergences to lean on", () => {
    // A sentence asserted from two cells would be worse than silence.
    const bias = biasOf(matrix({ blunder: { mistake: 2 } }));

    expect(bias.direction).toBeNull();
    expect(bias.over).toBe(2);
  });
});
