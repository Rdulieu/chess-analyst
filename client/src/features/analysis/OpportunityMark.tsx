import { OPPORTUNITY_TERM, opportunityGlyph, opportunityName } from "../../chess/opportunity";
import type { Opportunity } from "../../types";

/**
 * **What the opponent left on the table, written once** (US-30, ADR-0034).
 *
 * The `Analyse` page states it on two of the three sites the spec names — the
 * « Le moteur » column of the move list, and the `Relevé du coup` under the
 * diagram — and they have to say the **same string**. HP-03 found them saying
 * opposite things: the list flagged « ?! Opportunity » on four plies while the
 * relevé three centimetres below read « Rien à signaler sur ce coup » on the
 * very same four. One screen flagged and un-flagged the same Move.
 *
 * So the mark is a component rather than a fragment of markup copied into the
 * second site. The word, the glyph and the accessible name all come from the
 * module that owns them; nothing here is retyped, and nothing can drift between
 * the two places it appears.
 *
 * **`data-opportunity`, never `data-severity`.** The severity hook is the
 * engine's glyph's, and `_semantics` tints *any* element carrying it into a
 * filled chip in the Player's fault colours — the one colour on this screen that
 * means « votre faute », which is the opposite of what this story says. It was
 * slice 04's blocking finding, and jsdom loads no sheet to catch it a second
 * time: the hook is the cause, so the hook is what is asserted.
 */
export function OpportunityMark({ severity }: { severity: Opportunity["severity"] }) {
  return (
    <span
      data-part="opportunity"
      data-opportunity={severity}
      aria-label={opportunityName(severity)}
    >
      {opportunityGlyph(severity)} {OPPORTUNITY_TERM}
    </span>
  );
}
