import { describe, it, expect } from "vitest";
import {
  SEVERITIES,
  SEVERITY_GLYPH,
  SEVERITY_SQUARE_TINT,
  SEVERITY_TINT,
  SEVERITY_TINT_INK,
} from "../src/chess/severity";

/**
 * The severity module is the single source US-14 established, and US-13 keeps it
 * that way while emptying it of hex: it now holds **token names**, which is the
 * whole reason the tokens are custom properties (ADR-0013 — a `$variable` has
 * vanished by the time `react-chessboard`'s square-styles prop runs).
 *
 * These tests pin the token *names*, never a hue. The hues were judged once, on
 * the pilot; asserting one here would only make the next palette tweak red.
 */
describe("the severity vocabulary", () => {
  it("names a glyph for every severity — the primary signal, never the tint", () => {
    expect(SEVERITIES.map((s) => SEVERITY_GLYPH[s])).toEqual(["?!", "?", "??"]);
  });

  it("holds the chrome's tint as a token name, not as a colour", () => {
    expect(SEVERITY_TINT).toEqual({
      inaccuracy: "var(--tint-inaccuracy)",
      mistake: "var(--tint-mistake)",
      blunder: "var(--tint-blunder)",
    });
  });

  it("pairs every chrome tint with its own ink token", () => {
    // No tint's contrast may depend on the inherited `--ink`, which inverts with
    // the theme while the tint does too.
    expect(SEVERITY_TINT_INK).toEqual({
      inaccuracy: "var(--tint-inaccuracy-ink)",
      mistake: "var(--tint-mistake-ink)",
      blunder: "var(--tint-blunder-ink)",
    });
    expect(SEVERITIES.every((s) => SEVERITY_TINT_INK[s] === `${SEVERITY_TINT[s].slice(0, -1)}-ink)`)).toBe(
      true,
    );
  });

  it("holds a distinct, CONSTANT tint for a square, because a piece is painted on it", () => {
    // The dividing line is not the meaning of the colour but what is painted
    // over it: the piece keeps its ink in both themes, so the square's tint must
    // too. Measured on the pilot, a theme-varying tint here rendered its piece
    // at 1.49:1 in dark (ADR-0013).
    expect(SEVERITY_SQUARE_TINT).toEqual({
      inaccuracy: "var(--square-inaccuracy)",
      mistake: "var(--square-mistake)",
      blunder: "var(--square-blunder)",
    });
  });

  it("keeps the two families apart — no severity shares a token between them", () => {
    for (const severity of SEVERITIES) {
      expect(SEVERITY_SQUARE_TINT[severity]).not.toBe(SEVERITY_TINT[severity]);
    }
  });
});
