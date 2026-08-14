import { errorTally } from "../chess/evaluationCurve";
import { SEVERITIES, SEVERITY_GLYPH } from "../chess/severity";
import type { MoveAnnotation } from "../types";

const SEVERITY_WORD: Record<(typeof SEVERITIES)[number], [singular: string, plural: string]> = {
  inaccuracy: ["imprécision", "imprécisions"],
  mistake: ["erreur", "erreurs"],
  blunder: ["grosse erreur", "grosses erreurs"],
};

/**
 * How many flawed Moves the Player made in this Game, by severity (US-14).
 *
 * This is the one thing the `Evaluation curve` beside it adds that is **not**
 * already on screen, so it is real text rather than part of the `aria-hidden`
 * drawing — and it names each severity in words, the glyph alone being no help
 * read aloud.
 *
 * It is announced as **the Player's own** errors, deliberately: severities are
 * never derived for the opponent (CONTEXT.md), so a count worded as "this
 * Game's errors" would claim something the data does not say — and a drop in the
 * curve with no marker on it would read as a bug rather than as the opponent's
 * turn.
 */
export function ErrorTallyReadout({ annotations }: { annotations: MoveAnnotation[] }) {
  const tally = errorTally(annotations);

  return (
    <p aria-label="vos erreurs">
      {tally.total === 0
        ? "Vos erreurs : aucune sur cette partie."
        : `Vos erreurs : ${SEVERITIES.filter((severity) => tally[severity] > 0)
            .map((severity) => {
              const [singular, plural] = SEVERITY_WORD[severity];
              const count = tally[severity];
              return `${count} ${count > 1 ? plural : singular} ${SEVERITY_GLYPH[severity]}`;
            })
            .join(" · ")}`}
    </p>
  );
}
