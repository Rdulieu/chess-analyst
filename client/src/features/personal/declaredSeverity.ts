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
