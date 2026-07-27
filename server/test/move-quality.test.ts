import { describe, it, expect } from "vitest";
import { classifyMove } from "../src/danger/move-quality";

describe("classifyMove", () => {
  it("is not flagged when the winning-chances drop is under 10%", () => {
    expect(classifyMove(60, 52)).toBeNull();
  });

  it("is a Blunder when the winning-chances drop is 30% or more", () => {
    expect(classifyMove(70, 35)).toBe("blunder");
  });

  it("is a Mistake when the winning-chances drop is 20–30%", () => {
    expect(classifyMove(70, 45)).toBe("mistake");
  });

  it("is an Inaccuracy when the winning-chances drop is 10–20%", () => {
    expect(classifyMove(70, 55)).toBe("inaccuracy");
  });

  it("treats the band boundaries as belonging to the higher severity (10/20/30 exactly)", () => {
    expect(classifyMove(50, 40)).toBe("inaccuracy"); // drop exactly 10
    expect(classifyMove(50, 30)).toBe("mistake"); // drop exactly 20
    expect(classifyMove(50, 20)).toBe("blunder"); // drop exactly 30
  });
});
