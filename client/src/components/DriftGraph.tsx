import { driftScale, driftTrace } from "../chess/driftTrace";
import type { PhaseBand } from "../chess/phaseBands";
import type { MoveAnnotation } from "../types";

/**
 * The cumulative trace of what the Player lost, drawn **beside** the
 * `Evaluation curve` and never inside it: they are two different quantities, and
 * putting them on one axis is exactly what US-14's acceptance condition forbade
 * ("no possible divergence between the views"). Two drawings, one shared x axis,
 * compared by looking **down**.
 *
 * A flagged Move is a **step**; a run of small losses is a **slope**. That slope
 * is the `Drift`, and it is the thing a threshold reading is structurally blind
 * to — which is the whole reason this picture exists.
 *
 * **`aria-hidden`, and legitimately**: every figure in it is already text in the
 * Game's recap above (the total lost, the share on flagged Moves, the Drift).
 * That invariant is what licenses the drawing — it is not a dispensation, and if
 * the recap ever stops being on screen this drawing has to go with it.
 *
 * Not one colour is written here: the fill, the rules and the geometry are the
 * stylesheet's (`_dense`), which also owns the landscape box. Squeezed into a
 * narrow column a trace stops being a time axis and reads as a vertical drip.
 */
export function DriftGraph({
  annotations,
  currentPly,
  bands,
}: {
  annotations: MoveAnnotation[];
  currentPly: number;
  /** The Phase spans, for the boundary rules drawn OVER the area. */
  bands: PhaseBand[];
}) {
  const { points, lastX, total } = driftTrace(annotations);
  if (points.length === 0) return null;

  const span = Math.max(lastX, 1);
  // The box is worth at least a WHOLE Game — never the Game's own total, which
  // ended every trace flush at the top of its box and had the eye read
  // "height = gravity" on a Game that lost 5 %.
  const { ceiling, hundred, ticks } = driftScale(total);
  const line = points.map((p) => `${p.x},${100 - (p.lost / ceiling) * 100}`).join(" ");

  return (
    <div aria-hidden="true" data-part="drift-frame">
      {/* The graduated scale, OUTSIDE the plot and never over it: laid over the
          area it would sit on the trace itself, and the fill is measured at 0.12
          precisely so that what is drawn over it stays legible (ADR-0013).
          Percentages of the box, so a figure and its height are the same number. */}
      <ul data-part="drift-scale">
        <li data-mark="hundred" style={{ top: `${hundred}%` }}>
          100 %
        </li>
        {ticks.map((tick) => (
          <li key={tick.value} style={{ top: `${tick.y}%` }}>
            {tick.value}
          </li>
        ))}
      </ul>
      {/* The plot's own box, and it earns a wrapper: the frame, the ground and the
          one pixel of headroom the whole-Game rule needs are declared on it. That
          headroom is load-bearing — the rule sits flush on the top edge on any
          Game under 100 %, which is most of them, and half its stroke would
          otherwise be clipped by the very frame it is meant to be inside. */}
      <div data-part="drift-plot">
        <svg aria-hidden="true" viewBox={`0 0 ${span} 100`} preserveAspectRatio="none">
          {/* The area under the running total: a surface reads as an accumulation,
              where a bare line reads as a value. */}
          <polygon points={`0,100 ${line} ${lastX},100`} />
          {/* The Phase boundaries, drawn OVER the area and never as a background
              band: the area is opaque and full height, so anything painted behind
              it is invisible — and tinting over it would move the measured contrast
              of the marks (ADR-0013). */}
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
          {/* A whole Game's worth of chances, ruled across the box. Above it a Game
              cost more than a Game is worth; below it, less. It is drawn OVER the
              area for the same reason as the Phase boundaries — the area is opaque
              — and it is never identified by its colour alone: the scale prints
              "100 %" beside it, at its own height. */}
          <line
            data-mark="hundred"
            x1={0}
            y1={hundred}
            x2={span}
            y2={hundred}
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
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
      </div>
    </div>
  );
}
