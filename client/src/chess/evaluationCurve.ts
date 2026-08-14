import type { MoveAnnotation } from "../types";

/** One plotted Position: `x` is its `Move` index (0 = the starting Position),
 *  `whiteShare` is White's winning chances there (0–100). */
export interface CurvePoint {
  x: number;
  whiteShare: number;
}

/** A Game's `Evaluation curve` (CONTEXT.md), ready to draw: the points, and the
 *  rightmost `x` so a caller can size itself without re-deriving it. */
export interface EvaluationCurve {
  points: CurvePoint[];
  lastX: number;
}

/**
 * A Game's `Evaluation curve` from the per-Move annotations the Analyse page has
 * already loaded (US-14 — no engine call, no request of its own).
 *
 * Height is **winning chances**, never raw centipawns: they are the only bounded
 * quantity of the two, they are what the advantage bar beside the curve shows,
 * and they are the scale `Inaccuracy`/`Mistake`/`Blunder` are defined on — so a
 * visible drop is the same event as a flagged Move. A mate needs no special
 * case: it already arrives as 100 or 0.
 */
export function evaluationCurve(annotations: MoveAnnotation[]): EvaluationCurve {
  const points = annotations.map((annotation, x) => ({
    x,
    whiteShare: annotation.whiteWinChances,
  }));

  return { points, lastX: Math.max(0, points.length - 1) };
}
