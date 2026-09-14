import { Figure } from "./Figure";
import { OPPORTUNITY_TERM } from "../../chess/opportunity";
import type { OpportunityReading } from "../../types";

/**
 * **The opponent's half of the board** — what was offered, and what the Player
 * made of it (US-30, ADR-0034).
 *
 * The same grammar as the Player's own couple, on purpose: a **coverage** (how
 * many `Opportunity`s were looked at at all) and an **accuracy** (of those, how
 * many read on the band). Nothing new to learn — and nothing fused, either.
 * Judging one's own play and spotting what the opponent offers are **two
 * different abilities**, and their disagreement is the diagnosis worth the trip:
 * strong on oneself and blind to the opponent describes a player absorbed in
 * their own plan. A single rate would erase exactly that reading, which is why
 * this block sits **beside** « Ce que j'ai vu juste » and never inside its grid.
 *
 * **Raw, with its denominator, always.** Three `Opportunity`s read one out of
 * two is not 50 % of anything worth comparing between Games, and the requester
 * asked to judge the sample size themselves rather than be handed a rate that
 * hides it.
 */
export function OpportunityReadout({ opportunities }: { opportunities: OpportunityReading }) {
  const { offered, examined, agreed, unseen } = opportunities;

  return (
    <section data-part="confrontation-opportunities" aria-label="Ce qui m'a été offert">
      <h3>Ce qui m'a été offert</h3>
      <p data-part="opportunities-lede">
        Ce que l'adversaire a laissé sur la table, mesuré avec <strong>votre bande</strong> — et
        ce que votre lecture en a dit. Des chiffres <strong>à part</strong> : lire son propre jeu
        et voir ce qu'on vous offre sont deux aptitudes différentes.
      </p>
      <div data-part="opportunities-figures">
        <Figure
          name={`Ce que j'ai regardé chez l'adversaire`}
          of={offered}
          count={examined}
          unit={`${OPPORTUNITY_TERM}s offertes`}
          singular={`${OPPORTUNITY_TERM} offerte`}
          note={note(unseen)}
        />
        <Figure
          name={`Ce que j'ai lu juste chez l'adversaire`}
          of={examined}
          count={agreed}
          unit={`${OPPORTUNITY_TERM}s examinées`}
          singular={`${OPPORTUNITY_TERM} examinée`}
          note="Sur celles que vous avez regardées. Les trois mêmes termes que pour vos propres coups — Bonne lecture, Sous-lecture, Sur-lecture."
        />
      </div>
    </section>
  );
}

/**
 * How many were **never looked at** — said in the coverage figure's own note,
 * because it is the other half of that division and belongs nowhere else.
 *
 * Missed and never seen are different failures (CONTEXT.md), and only the second
 * is invisible to a reading: it can never appear in the accuracy figure, whose
 * denominator is what was examined. Left unsaid, a Player reading « 2 sur 3 »
 * would have to do the subtraction to learn the fact that matters most.
 */
function note(unseen: number): string {
  if (unseen === 0) {
    return `Sur les ${OPPORTUNITY_TERM}s que la partie a offertes. Vous les avez toutes regardées.`;
  }
  return `Sur les ${OPPORTUNITY_TERM}s que la partie a offertes. ${unseen} ${
    unseen === 1 ? "n'a jamais été regardée" : "n'ont jamais été regardées"
  } : invisible à votre lecture, ce qui n'est pas la même chose que mal jugée.`;
}
