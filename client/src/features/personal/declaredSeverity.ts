import { SEVERITY_GLYPH, SEVERITY_SQUARE_TINT } from "../../chess/severity";
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

/**
 * How each `Declared severity` is laid **on a board square** — the reading
 * route's diagram marking the destination square of the current Move (ADR-0022).
 *
 * **The device is shared; the source is not.** `Analyse` paints the engine's
 * measured severity, this route paints the Player's declared one, and it is the
 * screen that decides which table applies — never the square. An `Analyse`
 * diagram carrying the Player's marks, or a reading diagram carrying the
 * engine's, would be the one thing this ADR refuses: a square has neither a
 * column nor a title, only a colour, so it cannot hold two authors at once.
 *
 * The three shared severities are **taken from the engine's own table**, exactly
 * as the glyphs are, and for the same reason: the shared vocabulary is deliberate
 * all the way down, and a second literal token name here is how it stops being
 * shared. The two the engine has no band for bring their own tokens — the palette
 * had never had to paint a favourable verdict, since the engine only reports
 * faults.
 *
 * The tint is **never the only cue**: the glyph stays in the move list (ADR-0013).
 * And no distinction is made between a sealed verdict and a posterior one — the
 * panel already names the layer in words, and putting that difference on a tint
 * would be precisely the colour-only cue ADR-0013 forbids.
 */
export const DECLARED_SEVERITY_SQUARE_TINT: Record<DeclaredSeverity, string> = {
  blunder: SEVERITY_SQUARE_TINT.blunder,
  mistake: SEVERITY_SQUARE_TINT.mistake,
  inaccuracy: SEVERITY_SQUARE_TINT.inaccuracy,
  sound: "var(--square-sound)",
  good: "var(--square-good)",
};
