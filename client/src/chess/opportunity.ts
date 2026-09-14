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
 * **How the screen says what the opponent left behind**, opening the sentence on
 * both surfaces that state it — the Game's recap and the `Confrontation`'s block
 * of figures.
 *
 * A phrase rather than a word, because this is the clause that does the delicate
 * work: it names a *fact about the Position* and not a verdict on the opponent,
 * which is the distinction the whole story rests on. « Ce que l'adversaire a
 * **raté** » or « son cadeau » would both say the forbidden thing, and both are
 * one careless edit away from a second literal. Two screens saying it in two
 * files is how they drift; this is the file that owns the wording.
 */
export const OPPORTUNITY_OFFERED_PHRASE = "Ce que l'adversaire a laissé sur la table";

/**
 * The severity as a **size**, in the grammatical role an `Opportunity` gives it
 * — *de la taille d'une bévue*. A property of the `Opportunity`, never a
 * competing vocabulary, which is why the band is said in lower case: `Bévue`
 * with its capital is what one of the **Player's** Moves is called.
 *
 * Read from the label table rather than held as a second one, and read from
 * **here** by everything that says it — the accessible name below, and the
 * recap's breakdown. It was written out twice, character for character, with the
 * same rationale in both docblocks: exactly the shape that drifts the day one of
 * the three bands is renamed.
 */
export function opportunitySize(severity: OpportunitySeverity): string {
  return `de la taille d'une ${SEVERITY_LABEL[severity].toLowerCase()}`;
}

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
 * The size comes from `opportunitySize`, which is the one place that role is
 * written; this function only puts the term in front of it.
 */
export function opportunityName(severity: OpportunitySeverity): string {
  return `${OPPORTUNITY_TERM} ${opportunitySize(severity)}`;
}
