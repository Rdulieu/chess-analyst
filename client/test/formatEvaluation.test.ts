import { describe, it, expect } from "vitest";
import { formatEvaluation } from "../src/chess/formatEvaluation";

describe("formatEvaluation", () => {
  it("formats a positive cp Evaluation in pawns, one decimal, with a sign", () => {
    expect(formatEvaluation({ cp: 130, mate: null })).toBe("+1.3");
  });

  it("formats a negative cp Evaluation in pawns, one decimal, with a sign", () => {
    expect(formatEvaluation({ cp: -70, mate: null })).toBe("-0.7");
  });

  it("formats a positive forced mate as M<n>", () => {
    expect(formatEvaluation({ cp: null, mate: 3 })).toBe("M3");
  });

  it("formats a negative forced mate as -M<n>", () => {
    expect(formatEvaluation({ cp: null, mate: -2 })).toBe("-M2");
  });
});
