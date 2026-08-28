import { SEVERITY_GLYPH } from "../../chess/severity";
import type { DeclaredSeverity } from "../../types";

/**
 * What each `Declared severity` is called on screen. The three shared with the
 * engine keep the words the app already uses for a measured severity — the
 * shared vocabulary is the whole point (CONTEXT.md): a declared verdict beside a
 * measured one is only meaningful on identical labels.
 */
export const DECLARED_SEVERITY_LABEL: Record<DeclaredSeverity, string> = {
  blunder: "Bévue",
  mistake: "Erreur",
  inaccuracy: "Imprécision",
  sound: "Correct",
  good: "Bon",
};

/**
 * What each value **claims**, said in the Player's own terms. `Sound` and `Good`
 * carry the explanation that matters most: `Sound` is a verdict the Player
 * **poses** ("I looked, and I find nothing to fault"), not the silence of a Move
 * they never examined.
 */
export const DECLARED_SEVERITY_MEANING: Record<DeclaredSeverity, string> = {
  blunder: "une faute grave",
  mistake: "une faute",
  inaccuracy: "un coup imprécis",
  sound: "j'ai regardé, je ne trouve rien à reprocher",
  good: "meilleur qu'il n'y paraît",
};

/**
 * How each `Declared severity` is **written** — in the move list, and anywhere a
 * verdict is shown as a mark rather than as a word.
 *
 * The three the engine also has are **taken from the engine's own table**, not
 * re-typed: CONTEXT.md makes the shared vocabulary deliberate all the way down to
 * the glyph, and a second literal `"??"` in this file is precisely how a shared
 * vocabulary stops being shared. The two the engine has no band for extend the
 * notation instead of borrowing it — `!` is chess notation's own sign for a good
 * Move, and `✓` is deliberately from another family because `Sound` is not a
 * judgement of quality but a statement of examination.
 *
 * **This reverses a decision of US-16a**, which held that borrowing the engine's
 * marks "would suggest a measured verdict where there is only a declared one".
 * The confusion it feared has no screen to happen on: the reading route renders
 * the diagram with no engine prop at all, and the Analyse page renders none of
 * the Player's marks. Against that, `⚖` only ever said *a verdict exists here*,
 * and the Player had to open the Move to learn which.
 *
 * **The rule that travels with the reversal**: the day one screen shows both
 * authors at once — the natural slope of US-16b, which exists to hold three
 * readings side by side *without ever merging them* — identical glyphs will not
 * be enough, and they must be told apart by something other than colour.
 */
export const DECLARED_SEVERITY_GLYPH: Record<DeclaredSeverity, string> = {
  blunder: SEVERITY_GLYPH.blunder,
  mistake: SEVERITY_GLYPH.mistake,
  inaccuracy: SEVERITY_GLYPH.inaccuracy,
  good: "!",
  sound: "✓",
};
