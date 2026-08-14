import { evaluationCurve } from "../chess/evaluationCurve";
import type { MoveAnnotation } from "../types";

/** White's ground and Black's, plus the equality line and the current-Move cursor.
 *  Inline because the project has no stylesheet yet (US-13). */
const WHITE_GROUND = "#f5f5f5";
const BLACK_GROUND = "#2b2b2b";
const EQUALITY = "#8a8a8a";
const CURSOR = "#c05621";

/**
 * A Game's `Evaluation curve` (CONTEXT.md), drawn beside the board: the Game runs
 * left (the starting Position) to right (its last Move), and each side's ground
 * is its winning chances there — White's rising from the bottom, Black's from the
 * top, so an advantage reads as a surface rather than as a number.
 *
 * `currentPly` is marked by a cursor, which is why the caller passes its own
 * navigation index rather than the curve holding one: the graph is **read-only**
 * (US-14 — deliberately not a way to navigate), so the board stays the single
 * source of where the Player is.
 *
 * **`aria-hidden`, and accurately so**: every figure here is already text in the
 * board component — SAN, severity glyph and `Evaluation` per Move in the move
 * list, the current-Move readout, the advantage bar. Announcing 80 half-moves
 * again would be noise, and summarising them would be an interpretation this
 * feature does not compute. The non-colour cue for the current Move is the move
 * list's own `aria-current`, which already exists.
 */
export function EvaluationGraph({
  annotations,
  currentPly,
}: {
  annotations: MoveAnnotation[];
  currentPly: number;
}) {
  const { points, lastX } = evaluationCurve(annotations);
  if (points.length === 0) return null;

  // y grows downward in SVG, so White's share is measured up from the bottom.
  const boundary = points.map((p) => `${p.x},${100 - p.whiteShare}`).join(" ");
  const whiteGround = `0,100 ${boundary} ${lastX},100`;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${Math.max(lastX, 1)} 100`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%", display: "block", background: BLACK_GROUND }}
    >
      <polygon points={whiteGround} fill={WHITE_GROUND} />
      <line x1={0} y1={50} x2={lastX} y2={50} stroke={EQUALITY} strokeWidth={0.5} strokeDasharray="2 2" />
      <line
        x1={currentPly}
        y1={0}
        x2={currentPly}
        y2={100}
        stroke={CURSOR}
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
