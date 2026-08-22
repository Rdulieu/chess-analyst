import { driftTrace } from "../chess/driftTrace";
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
  // A Game that lost nothing still gets a full box and a flat line at the
  // bottom, rather than a division by zero or an empty frame.
  const ceiling = Math.max(total, 1);
  const line = points.map((p) => `${p.x},${100 - (p.lost / ceiling) * 100}`).join(" ");

  return (
    <div aria-hidden="true">
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
  );
}
