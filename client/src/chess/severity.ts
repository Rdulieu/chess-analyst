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

/** Distinct per-severity tint — always supplementary to the glyph, never the
 *  only signal (the rule since US-3's accessibility finding). */
export const SEVERITY_TINT: Record<Severity, string> = {
  inaccuracy: "#fff3b0",
  mistake: "#ffcc80",
  blunder: "#ff8a80",
};

/** The severities in the order they are always listed: least to most serious. */
export const SEVERITIES: Severity[] = ["inaccuracy", "mistake", "blunder"];
