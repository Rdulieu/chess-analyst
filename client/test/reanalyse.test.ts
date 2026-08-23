import { describe, it, expect } from "vitest";
import { rebuildMinutes } from "../src/features/analysis/rebuildCost";

describe("What rebuilding an analysis costs, in words the Player can act on", () => {
  it("scales with the Positions to search, since that is what the engine actually spends", () => {
    expect(rebuildMinutes(60)).toBeLessThan(rebuildMinutes(180));
  });

  it("never promises less than a minute: the smallest honest unit is one", () => {
    // A figure of "0 minutes" would read as "instant", and no engine run is.
    expect(rebuildMinutes(1)).toBe(1);
    expect(rebuildMinutes(0)).toBe(1);
  });

  it("stays an order of magnitude, not a countdown", () => {
    // ~1 s per Position under the current regime: a 170-Position Game is minutes,
    // and the figure is round because the estimate does not deserve precision.
    expect(rebuildMinutes(170)).toBe(3);
    expect(rebuildMinutes(48)).toBe(1);
  });
});
