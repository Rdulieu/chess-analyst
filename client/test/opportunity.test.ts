import { describe, it, expect } from "vitest";
import { OPPORTUNITY_TERM, opportunityName, opportunityGlyph } from "../src/chess/opportunity";
import { SEVERITY_GLYPH, SEVERITY_LABEL } from "../src/chess/severity";
import { DECLARED_SEVERITY_LABEL } from "../src/features/personal/declaredSeverity";

/**
 * The word and the glyph an `Opportunity` is shown with (US-30, ticket 04).
 *
 * The ticket's rule is that neither is ever **retyped**: a Player who reads the
 * same fact in the move list and on the cartouche must read **one** fact, not
 * two that resemble each other. So these tests assert the *identity* of the
 * strings with the tables that own them, never a literal copy of them — a test
 * that spelled « Bévue » itself would be the second copy it exists to forbid.
 */
describe("the Opportunity's word and glyph", () => {
  it("names the Opportunity with one word, the same everywhere it is shown", () => {
    expect(OPPORTUNITY_TERM).toBe("Opportunity");
  });

  it("takes its glyph from the engine's own table, never a second copy", () => {
    expect(opportunityGlyph("blunder")).toBe(SEVERITY_GLYPH.blunder);
    expect(opportunityGlyph("mistake")).toBe(SEVERITY_GLYPH.mistake);
    expect(opportunityGlyph("inaccuracy")).toBe(SEVERITY_GLYPH.inaccuracy);
  });

  it("says the severity as a PROPERTY of the Opportunity, in the app's own words", () => {
    // *Une `Opportunity` de la taille d'une bévue* — the severity qualifies the
    // Opportunity rather than competing with it (CONTEXT.md, ADR-0034).
    for (const severity of ["inaccuracy", "mistake", "blunder"] as const) {
      const name = opportunityName(severity);
      expect(name.startsWith(OPPORTUNITY_TERM)).toBe(true);
      expect(name).toContain(SEVERITY_LABEL[severity].toLowerCase());
    }
  });

  it("never borrows the three words the tool reserves for the Player's own Moves", () => {
    // The severity is said in lower case, as the property of something else.
    // « Bévue » with a capital is what the Player's own Move is called, and the
    // screen must not put that on the opponent (SPEC, US-31).
    for (const severity of ["inaccuracy", "mistake", "blunder"] as const) {
      expect(opportunityName(severity)).not.toContain(DECLARED_SEVERITY_LABEL[severity]);
    }
  });

  it("uses none of the three forbidden phrasings", () => {
    const every = (["inaccuracy", "mistake", "blunder"] as const).map(opportunityName).join(" ");
    for (const banned of ["erreur de l'adversaire", "cadeau", "chance manquée"]) {
      expect(every.toLowerCase()).not.toContain(banned);
    }
  });

  it("keeps ONE table of severity words — the declared labels re-read it", () => {
    // `chess/severity.ts` owns the three measured bands' words; the declared
    // table borrows them, exactly as it already borrows the glyphs. Two literals
    // is how a shared vocabulary stops being shared.
    expect(DECLARED_SEVERITY_LABEL.blunder).toBe(SEVERITY_LABEL.blunder);
    expect(DECLARED_SEVERITY_LABEL.mistake).toBe(SEVERITY_LABEL.mistake);
    expect(DECLARED_SEVERITY_LABEL.inaccuracy).toBe(SEVERITY_LABEL.inaccuracy);
  });
});
