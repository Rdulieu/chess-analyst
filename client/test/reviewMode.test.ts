import { beforeEach, describe, it, expect } from "vitest";
import {
  loadReviewMode,
  saveReviewMode,
  REVIEW_MODES,
  atLeastAnnotated,
} from "../src/features/review/reviewMode";

beforeEach(() => localStorage.clear());

describe("Review mode — the remembered level", () => {
  it("is Unaided when the Player has never chosen: a Game opens to be read", () => {
    expect(loadReviewMode()).toBe("unaided");
  });

  it("remembers the chosen level, so it is chosen once and not on every Game", () => {
    saveReviewMode("detailed");

    expect(loadReviewMode()).toBe("detailed");
  });

  it("falls back to Unaided rather than trusting a stored value that names no level", () => {
    localStorage.setItem("chess-analyst.review-mode", "verbose");

    expect(loadReviewMode()).toBe("unaided");
  });

  it("offers exactly three levels, in order of what they reveal", () => {
    expect(REVIEW_MODES).toEqual(["unaided", "annotated", "detailed"]);
  });

  it("raises Unaided to Annotated but never takes a level away", () => {
    // A finished pass answers a question the Player asked; it must not demote a
    // Player who was already reading the record.
    expect(atLeastAnnotated("unaided")).toBe("annotated");
    expect(atLeastAnnotated("annotated")).toBe("annotated");
    expect(atLeastAnnotated("detailed")).toBe("detailed");
  });
});
