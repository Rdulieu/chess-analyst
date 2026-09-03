import { describe, it, expect } from "vitest";
import { compileStylesheet, declarationsFor } from "./support/tokenAudit";
import { DECLARED_SEVERITIES } from "../src/types";

/**
 * The Player's verdict, tinted in the move list (US-29). Read off the COMPILED
 * stylesheet, which is the only tier below the agentic one where a rule is
 * observable at all — jsdom never loads the sheet. Contrast and the actual
 * rendering stay the Feature Path's job.
 *
 * **Why the board's family on a piece of chrome.** ADR-0013 keeps two families:
 * `--tint-*` follows the theme and carries its own ink, `--square-*` is constant
 * across themes because a piece is painted over it. The verdict in the list is
 * chrome, and it wears the SQUARE family — deliberately. The frontier separates
 * **authors**, not surfaces: a piece of chrome speaking for the board wears the
 * board's tokens, which is why the selection buttons already do exactly this. It
 * is what makes one verdict one colour, from the button that sets it to the
 * square it lands on to the list that recalls it.
 */
const css = compileStylesheet();

describe("the Player's verdict in the move list", () => {
  it("tints all five values, each from the board's own family", () => {
    for (const verdict of DECLARED_SEVERITIES) {
      const rule = declarationsFor(css, `[data-part="move-marks"] [data-verdict="${verdict}"]`);
      expect(rule.get("background"), verdict).toBe(`var(--square-${verdict})`);
      expect(rule.get("color"), verdict).toBe("var(--square-notation)");
    }
  });

  it("names every token in full, so the audit can see them", () => {
    // Written out rather than generated from a loop over the five verdicts, and
    // that is the point (ADR-0013): the token-consistency audit reads this file
    // as source, so a name assembled by interpolation is a name it cannot see —
    // and it is the only thing standing in for the compile error custom
    // properties cost us.
    for (const verdict of DECLARED_SEVERITIES) {
      expect(css).toContain(`--square-${verdict}`);
    }
  });
});
