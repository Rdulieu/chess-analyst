import { PHASE_LABEL } from "../chess/phase";
import type { PhaseBand } from "../chess/phaseBands";

/**
 * The `Phase`s named in **real text**, on the axis both drawings share — one
 * ribbon for the two, since they share that axis. It is the reading distance the
 * boundary rules alone cannot give: a rule says a boundary happened, the ribbon
 * says **which** Phase is which.
 *
 * Between the two drawings rather than above them, so it reads as belonging to
 * both. Its widths are the bands' own spans, so a label sits over the Moves it
 * names.
 *
 * Deliberately **not** `aria-hidden`, unlike the drawings it sits between: this
 * is text, it is the only place the Phases are named on this axis, and the move
 * list's transition marks (slice 03) are the other, unrelated reading.
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
          {PHASE_LABEL[band.phase]}
        </span>
      ))}
    </p>
  );
}
