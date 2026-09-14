import { SEVERITY_GLYPH, SEVERITY_LABEL } from "./severity";
import type { Opportunity } from "../types";

type OpportunitySeverity = Opportunity["severity"];

/**
 * **How an `Opportunity` is written on screen** (US-30, CONTEXT.md, ADR-0034).
 *
 * The measurement is the Player's own band; the **subject** is not. So the
 * screen needs a word of its own, and it is this one — `Opportunity`, the
 * project's term, used verbatim rather than translated into anything that would
 * read as a judgement on the opponent. The three phrasings the vocabulary
 * refuses (« erreur de l'adversaire », « cadeau », « chance manquée ») are
 * refused here first: this module is the only place the word is chosen.
 *
 * **Beside the word, not inside it: the severity.** It is a *property* of the
 * `Opportunity` — *une `Opportunity` de la taille d'une bévue* — never a
 * competing vocabulary, which is why the band is said in lower case and after
 * the term. `Bévue` with its capital is what one of the **Player's** Moves is
 * called, and this tool reserves the three names for its own subject.
 *
 * Nothing here is retyped. The glyph comes from the engine's table and the word
 * from the engine's labels, so a Player who meets `??` on the move list, `??`
 * on the cartouche and the same band spelled out beneath is looking at **one**
 * fact shown three times — which is only true if it *is* one fact.
 */
export const OPPORTUNITY_TERM = "Opportunity";

/**
 * The glyph, from the table that owns it. An `Opportunity` the size of a
 * `Blunder` is written `??` because that is how that band is written here — a
 * second sign would ask the Player to learn a second notation for the same
 * measurement.
 */
export function opportunityGlyph(severity: OpportunitySeverity): string {
  return SEVERITY_GLYPH[severity];
}

/**
 * The `Opportunity` named in full, with its size — the accessible name, and the
 * cartouche's words.
 *
 * Lower-cased from the label table rather than held as a second table: the
 * three bands already have their words, and what changes here is only their
 * grammatical role. A copy would be free to drift the day one of the three is
 * renamed, and drifting is precisely what the ticket forbids.
 */
export function opportunityName(severity: OpportunitySeverity): string {
  return `${OPPORTUNITY_TERM} de la taille d'une ${SEVERITY_LABEL[severity].toLowerCase()}`;
}
