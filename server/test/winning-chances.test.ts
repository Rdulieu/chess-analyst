import { describe, it, expect } from "vitest";
import { winningChances } from "../src/danger/winning-chances";

describe("winningChances", () => {
  it("is 50% at an equal position (cp 0)", () => {
    expect(winningChances({ cp: 0, mate: null })).toBeCloseTo(50, 5);
  });

  it("saturates to 100% on a mate for the side to move", () => {
    expect(winningChances({ cp: null, mate: 3 })).toBe(100);
  });

  it("saturates to 0% on a mate against the side to move", () => {
    expect(winningChances({ cp: null, mate: -2 })).toBe(0);
  });
});
