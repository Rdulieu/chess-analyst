import { describe, it, expect } from "vitest";
import { classifyMove } from "../src/danger/move-quality";

/**
 * The bands are written as **numbers** here, never as the imported constant: a
 * test that spells the threshold `INACCURACY_DROP` still passes after a retune
 * that changes what the threshold means, which is precisely how a scale can move
 * under a Player without a single test going red.
 */
describe("classifyMove", () => {
  it("is not flagged when the winning-chances drop is under 5%", () => {
    expect(classifyMove(60, 55.1)).toBeNull();
  });

  it("is an Inaccuracy from 5% — the smallest drop this app is willing to call a fault", () => {
    // The Move the app used to be silent about, and the whole point of US-37: a
    // Player who loses six points of winning chances has made a mistake they can
    // see, and an app that says nothing about it is not believable.
    expect(classifyMove(60, 54)).toBe("inaccuracy");
  });

  it("is a Blunder when the winning-chances drop is 30% or more", () => {
    expect(classifyMove(70, 35)).toBe("blunder");
  });

  it("is a Mistake when the winning-chances drop is 20–30%", () => {
    expect(classifyMove(70, 45)).toBe("mistake");
  });

  it("is an Inaccuracy across the whole 5–20% band", () => {
    expect(classifyMove(70, 55)).toBe("inaccuracy"); // 15, as before
    expect(classifyMove(70, 63)).toBe("inaccuracy"); // 7, silent before US-37
  });

  it("treats the band boundaries as belonging to the higher severity (5/20/30 exactly)", () => {
    expect(classifyMove(50, 45)).toBe("inaccuracy"); // drop exactly 5
    expect(classifyMove(50, 30)).toBe("mistake"); // drop exactly 20
    expect(classifyMove(50, 20)).toBe("blunder"); // drop exactly 30
  });

  it("leaves the Mistake and Blunder boundaries exactly where they were", () => {
    // Only the floor moves. What the Player has learnt to read of `?` and `??`
    // must not change meaning under their feet — hence the boundaries are
    // asserted from both sides rather than merely restated.
    expect(classifyMove(50, 30.1)).toBe("inaccuracy"); // 19.9
    expect(classifyMove(50, 30)).toBe("mistake"); // 20.0
    expect(classifyMove(50, 20.1)).toBe("mistake"); // 29.9
    expect(classifyMove(50, 20)).toBe("blunder"); // 30.0
  });
});
