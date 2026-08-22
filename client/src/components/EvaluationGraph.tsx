import { evaluationCurve } from "../chess/evaluationCurve";
import { SEVERITY_GLYPH, SEVERITY_TINT, SEVERITY_TINT_INK } from "../chess/severity";
import type { PhaseBand } from "../chess/phaseBands";
import type { MoveAnnotation } from "../types";

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
 * **Not one colour of this picture is written here.** The two grounds, the equality
 * line and the current-Move cursor are all declarations in the stylesheet
 * (`_dense`), reached by `data-mark` where two marks had to be told apart: a custom
 * property resolves in a declaration and never in an attribute value, so
 * `stroke="var(--curve-cursor)"` would paint nothing at all. The marks are drawn
 * over the two constant player grounds, so they are constant too — the same rule
 * that sends the board's severity tints to the constant family — and their values
 * clear 3:1 against **both** grounds at once, which is why neither is the
 * eyeballed value US-14 shipped (2.92:1 and 2.93:1 against the one ground each
 * happened to sit on).
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
  bands = [],
}: {
  annotations: MoveAnnotation[];
  currentPly: number;
  /**
   * The `Phase` spans, drawn as rules OVER the two grounds — the equality line's
   * own idiom. Never as background bands: the grounds are opaque and full height,
   * so anything behind them is invisible, and a tint laid over them would move
   * the contrast the markers and the cursor were measured at (ADR-0013).
   */
  bands?: PhaseBand[];
}) {
  const { points, lastX, markers } = evaluationCurve(annotations);
  if (points.length === 0) return null;

  const span = Math.max(lastX, 1);
  // y grows downward in SVG, so White's share is measured up from the bottom.
  const boundary = points.map((p) => `${p.x},${100 - p.whiteShare}`).join(" ");
  const whiteGround = `0,100 ${boundary} ${lastX},100`;

  return (
    // Neither box sizes itself any more: the sheet gives the curve its landscape
    // box (`[data-part="curve"]`, `_dense`) and Black's ground with it, and this
    // draws inside whatever it is given.
    <div aria-hidden="true">
      <svg aria-hidden="true" viewBox={`0 0 ${span} 100`} preserveAspectRatio="none">
        {/* White's share of the picture. Its fill, like Black's ground behind it,
            is the sheet's (`_dense`): a player colour is a declaration, and a
            custom property never resolves in a `fill=` attribute anyway. */}
        <polygon points={whiteGround} />
        <line
          data-mark="equality"
          x1={0}
          y1={50}
          x2={lastX}
          y2={50}
          strokeWidth={0.5}
          strokeDasharray="2 2"
        />
        {bands.slice(1).map((band) => (
          <line
            key={band.from}
            data-mark="phase-boundary"
            x1={band.from}
            y1={0}
            x2={band.from}
            y2={100}
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <line
          data-mark="cursor"
          x1={currentPly}
          y1={0}
          x2={currentPly}
          y2={100}
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {markers.map((marker) => (
        // Four declarations, and every one of them is DATA: where the mark goes,
        // and which severity it means. Its shape — absolutely placed, centred on
        // its point, a bordered pill in mono — is the sheet's (`_dense`), which is
        // why nothing static is written here any more.
        <span
          key={marker.x}
          style={{
            left: `${(marker.x / span) * 100}%`,
            top: `${100 - marker.whiteShare}%`,
            // The tint AND its own ink, read as a pair from the single source the
            // move list reads, so the two views of one severity cannot drift
            // apart. Why the PAIR and not the tint alone: `top` is the boundary
            // between the two player grounds, so a marker does not sit on one of
            // them — it STRADDLES both, and each half of the pair carries it over
            // one. Measured: in dark the tint detaches it from White's share
            // (8.53:1) and the border, which is `currentColor` in the sheet and so
            // follows this ink, detaches it from Black's (11.31:1); in light the
            // roles swap (9.17 / 11.92). Neither half would do the job alone, in
            // either theme — which is a stronger reason than "the inherited
            // `--ink` inverts", true though that also is.
            background: SEVERITY_TINT[marker.severity],
            color: SEVERITY_TINT_INK[marker.severity],
          }}
        >
          {SEVERITY_GLYPH[marker.severity]}
        </span>
      ))}
    </div>
  );
}
