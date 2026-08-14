import type { MoveAnnotation } from "../types";

/** One plotted Position: `x` is its `Move` index (0 = the starting Position),
 *  `whiteShare` is White's winning chances there (0–100). */
export interface CurvePoint {
  x: number;
  whiteShare: number;
}

/** A flawed Move of the Player's, sitting on the curve where it was played. */
export interface CurveMarker extends CurvePoint {
  severity: NonNullable<MoveAnnotation["severity"]>;
}

/** A Game's `Evaluation curve` (CONTEXT.md), ready to draw: the points, the
 *  rightmost `x` so a caller can size itself without re-deriving it, and the
 *  Player's flawed Moves placed along it. */
export interface EvaluationCurve {
  points: CurvePoint[];
  lastX: number;
  markers: CurveMarker[];
}

/** How many flawed Moves the **Player** made in a Game, by severity. */
export interface ErrorTally {
  inaccuracy: number;
  mistake: number;
  blunder: number;
  total: number;
}

/**
 * The Player's flawed Moves in a Game, counted by severity (US-14) — a display
 * aggregate over annotations the page already holds, not a stored figure
 * (ADR-0009).
 *
 * It counts **the Player's own** Moves and nothing else, because that is all the
 * data contains: severities are never derived for the opponent (CONTEXT.md —
 * this tool is about the Player's own improvement). Anything shown from this
 * must therefore be worded as the Player's own errors; read as "the errors of
 * this Game" it would be wrong.
 */
export function errorTally(annotations: MoveAnnotation[]): ErrorTally {
  const tally: ErrorTally = { inaccuracy: 0, mistake: 0, blunder: 0, total: 0 };

  for (const { severity } of annotations) {
    if (!severity) continue;
    tally[severity] += 1;
    tally.total += 1;
  }

  return tally;
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

  // Ply 0 follows no Move, and an opponent's Move never carries a severity, so
  // both fall out of this filter rather than needing a rule of their own.
  const markers = annotations.flatMap((annotation, x) =>
    annotation.severity
      ? [{ x, whiteShare: annotation.whiteWinChances, severity: annotation.severity }]
      : [],
  );

  return { points, lastX: Math.max(0, points.length - 1), markers };
}
