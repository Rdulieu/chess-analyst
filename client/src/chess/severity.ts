import type { MoveAnnotation } from "../types";

type Severity = NonNullable<MoveAnnotation["severity"]>;

/** How a severity is written wherever it is shown: the move list, the error
 *  tally, the curve's markers. One vocabulary, so nothing new is to be learnt
 *  from one view to the next (CONTEXT.md — `Inaccuracy`/`Mistake`/`Blunder`). */
export const SEVERITY_GLYPH: Record<Severity, string> = {
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
};

/** Distinct per-severity tint for the app's **chrome** — the move list's glyph,
 *  the curve's markers. Always supplementary to the glyph, never the only signal
 *  (the rule since US-3's accessibility finding).
 *
 *  A **token name**, not a colour: this module is consumed from TypeScript, past
 *  the point where an SCSS `$variable` still exists, which is precisely why the
 *  tokens are custom properties (ADR-0013). `var(--tint-blunder)` crosses that
 *  boundary; `$blunder` does not. These tints follow the theme, and each carries
 *  its own `--tint-*-ink` so their contrast never depends on inherited `--ink`. */
export const SEVERITY_TINT: Record<Severity, string> = {
  inaccuracy: "var(--tint-inaccuracy)",
  mistake: "var(--tint-mistake)",
  blunder: "var(--tint-blunder)",
};

/** The ink that goes **with** each chrome tint. Kept beside it rather than left
 *  to the inherited `--ink`: a semantic tint is dark at night and light by day,
 *  so an inherited ink flips legibility with the theme. Wherever `SEVERITY_TINT`
 *  is read from TypeScript, this is read with it — the pair, never the tint
 *  alone. */
export const SEVERITY_TINT_INK: Record<Severity, string> = {
  inaccuracy: "var(--tint-inaccuracy-ink)",
  mistake: "var(--tint-mistake-ink)",
  blunder: "var(--tint-blunder-ink)",
};

/** The same severities as laid **on a board square** — a distinct, deliberately
 *  theme-CONSTANT family. The dividing line is not the meaning of the colour but
 *  what is painted over it: `react-chessboard` draws the piece on top, and the
 *  piece keeps its ink in both themes. Measured on the pilot, the chrome's
 *  theme-varying tint used here rendered its piece at 1.49:1 in dark (ADR-0013).
 *
 *  Two records, one module: still one source of truth, now with the rule that
 *  separates the two families written down beside them. */
export const SEVERITY_SQUARE_TINT: Record<Severity, string> = {
  inaccuracy: "var(--square-inaccuracy)",
  mistake: "var(--square-mistake)",
  blunder: "var(--square-blunder)",
};

/** The severities in the order they are always listed: least to most serious. */
export const SEVERITIES: Severity[] = ["inaccuracy", "mistake", "blunder"];
