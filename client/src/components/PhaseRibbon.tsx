import { PHASE_RIBBON_LABEL } from "../chess/phase";
import type { PhaseBand } from "../chess/phaseBands";

/**
 * The `Phase`s named in **real text**, on the axis of the curve. It is the
 * reading distance the boundary rules alone cannot give: a rule says a boundary
 * happened, the ribbon says **which** Phase is which.
 *
 * **It belongs to the curve, and appears wherever the curve does.** It used to
 * sit inside the `Détaillé` guard, described here as living "between the two
 * drawings" — true only at that one level, and false the moment US-26 needed
 * the ribbon on a screen that must not carry the record and the recap. Below
 * the curve at `Annoté`, between the two drawings at `Détaillé`: one rule,
 * whose wording no longer assumes the second drawing exists.
 *
 * Its widths are the bands' own spans, so a label sits over the Moves it names.
 *
 * Deliberately **not** `aria-hidden`, unlike the drawings it accompanies: this
 * is text, it is the only place the Phases are named on this axis, and the move
 * list's transition marks are the other, unrelated reading.
 */
export function PhaseRibbon({ bands, lastX }: { bands: PhaseBand[]; lastX: number }) {
  if (bands.length === 0) return null;
  const span = Math.max(lastX, 1);

  return (
    <p data-part="phase-ribbon" aria-label="phases de la partie">
      {bands.map((band) => (
        <span
          key={band.from}
          data-phase={band.phase}
          // The only inline declaration, and it is DATA: how much of the axis
          // this Phase covers. Everything else is the sheet's.
          style={{ flexGrow: Math.max(band.to - band.from, 0.001) / span }}
        >
          {/* The label is one level in: padding on the band itself would be taken
              out of the free space before the proportional split and push every
              band off the axis it is meant to sit on. */}
          <span>{PHASE_RIBBON_LABEL[band.phase]}</span>
        </span>
      ))}
    </p>
  );
}
