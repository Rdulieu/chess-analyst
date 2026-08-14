import { evaluationCurve } from "../chess/evaluationCurve";
import { SEVERITY_GLYPH, SEVERITY_TINT } from "../chess/severity";
import type { MoveAnnotation } from "../types";

/** White's ground and Black's, plus the equality line and the current-Move cursor.
 *  Inline because the project has no stylesheet yet (US-13). */
const WHITE_GROUND = "#f5f5f5";
const BLACK_GROUND = "#2b2b2b";
const EQUALITY = "#8a8a8a";
const CURSOR = "#c05621";
const MARKER_INK = "#1a1a1a";

/**
 * A Game's `Evaluation curve` (CONTEXT.md), drawn beside the board: the Game runs
 * left (the starting Position) to right (its last Move), and each side's ground
 * is its winning chances there — White's rising from the bottom, Black's from the
 * top, so an advantage reads as a surface rather than as a number. The Player's
 * own flawed Moves are marked where they were played, by their glyph.
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
 *
 * The ground is one stretched SVG (the shape is all that matters), but the
 * markers are **not** in it: the viewBox scales x and y by different factors, so
 * a glyph drawn inside it comes out smeared. They are positioned over it
 * instead, which also lets them keep a legible ink colour on a light ground —
 * the tint reinforces, the glyph carries.
 */
export function EvaluationGraph({
  annotations,
  currentPly,
}: {
  annotations: MoveAnnotation[];
  currentPly: number;
}) {
  const { points, lastX, markers } = evaluationCurve(annotations);
  if (points.length === 0) return null;

  const span = Math.max(lastX, 1);
  // y grows downward in SVG, so White's share is measured up from the bottom.
  const boundary = points.map((p) => `${p.x},${100 - p.whiteShare}`).join(" ");
  const whiteGround = `0,100 ${boundary} ${lastX},100`;

  return (
    <div aria-hidden="true" style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${span} 100`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%", display: "block", background: BLACK_GROUND }}
      >
        <polygon points={whiteGround} fill={WHITE_GROUND} />
        <line
          x1={0}
          y1={50}
          x2={lastX}
          y2={50}
          stroke={EQUALITY}
          strokeWidth={0.5}
          strokeDasharray="2 2"
        />
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
      {markers.map((marker) => (
        <span
          key={marker.x}
          style={{
            position: "absolute",
            left: `${(marker.x / span) * 100}%`,
            top: `${100 - marker.whiteShare}%`,
            transform: "translate(-50%, -50%)",
            font: "bold 11px monospace",
            color: MARKER_INK,
            background: SEVERITY_TINT[marker.severity],
            border: `1px solid ${MARKER_INK}`,
            borderRadius: 3,
            padding: "0 2px",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
          }}
        >
          {SEVERITY_GLYPH[marker.severity]}
        </span>
      ))}
    </div>
  );
}
