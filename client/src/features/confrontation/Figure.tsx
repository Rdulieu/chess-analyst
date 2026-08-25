/**
 * One figure of a `Confrontation`: its count beside its rate and never without
 * it, and the question it answers named — so two figures side by side cannot be
 * read as one.
 *
 * Shared by the per-Game screen and the summary, because they are the same
 * figure at two altitudes. Two copies would drift, the way `moveName` already
 * did once on this feature.
 *
 * A **null denominator gives no rate**, not a zero: nothing was there to judge,
 * and a `0 %` would read as a failure where there was no attempt.
 */
export function Figure({
  name,
  count,
  of,
  unit,
  singular,
  note,
}: {
  name: string;
  count: number;
  of: number;
  unit: string;
  /** The same unit for a denominator of one — "1 verdicts" reads as a bug. */
  singular: string;
  note: string;
}) {
  return (
    <fieldset data-part="figure" aria-label={name}>
      <legend>{name}</legend>
      <p data-part="figure-value">
        {of === 0 ? (
          <strong>Pas de chiffre</strong>
        ) : (
          <>
            <strong>{Math.round((count / of) * 100)} %</strong> — {count} sur {of}{" "}
            {of === 1 ? singular : unit}
          </>
        )}
      </p>
      <p data-part="figure-note">{note}</p>
    </fieldset>
  );
}
