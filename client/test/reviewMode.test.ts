import { describe, it, expect } from "vitest";
import {
  INITIAL_REVIEW_MODE,
  REVIEW_MODES,
  atLeastAnnotated,
} from "../src/features/review/reviewMode";

/*
 * This module used to REMEMBER the chosen level, across Games and sessions —
 * "chosen once and not on every Game" — and had the tests to say so. US-28
 * withdrew that, and the reason is worth keeping next to the tests that replace
 * them: a level above Unaided on an analysed Game is what records a reading as
 * INFORMED, so a level inherited from yesterday stamped a reading nobody had
 * asked to inform. Whether a level survives an opening is a question about the
 * honesty of the archive, not about convenience.
 *
 * The withdrawn rule is asserted inverted where it is OBSERVABLE — on the
 * Analyse screen, which opens Unaided whatever the browser still holds. Here
 * there is only the constant it now starts from.
 */
describe("Review mode — the level of one review", () => {
  it("starts every review at Unaided: a Game is opened to be read", () => {
    expect(INITIAL_REVIEW_MODE).toBe("unaided");
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
