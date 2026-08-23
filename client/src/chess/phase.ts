import type { MoveAnnotation } from "../types";

/** A `Phase`, as the server derives it (CONTEXT.md). */
export type Phase = MoveAnnotation["phase"];

/** Each `Phase` in words. The Phase is never carried by a colour: it is read on
 *  the Move being studied and scanned in the move list, and both have to work
 *  aloud (ADR-0013 — no meaning by tint alone). */
export const PHASE_LABEL: Record<Phase, string> = {
  early: "Début de partie",
  middlegame: "Milieu de partie",
  endgame: "Finale",
};

/**
 * The shorter name the **ribbon** uses. A band is only as wide as its Phase's
 * share of the Game, and a middlegame lasting a dozen Moves rendered
 * "Milieu de pa…" — or, on a short one, "M…", which names nothing at all. These
 * are still words, and the full names are a Move-list mark away.
 */
export const PHASE_RIBBON_LABEL: Record<Phase, string> = {
  early: "Début",
  middlegame: "Milieu",
  endgame: "Finale",
};

/** The mark the move list puts where a Phase begins, in words. */
export const PHASE_START_LABEL: Record<Phase, string> = {
  early: "Début de la partie",
  middlegame: "Début du milieu de partie",
  endgame: "Début de la finale",
};

/**
 * Where each `Phase` begins in a Game — the boundaries the move list marks, so
 * a frontier is something the Player **sees while scanning** rather than
 * something they must click each Move to discover.
 *
 * The first Phase is never marked: a Game starts somewhere, and saying so on
 * every Game would be noise. And because the derivation **latches**, there are
 * **at most two** marks in a Game — and none at all in one that never leaves
 * the start.
 */
export function phaseStarts(annotations: MoveAnnotation[]): { ply: number; phase: Phase }[] {
  return annotations.flatMap((annotation, ply) =>
    ply > 0 && annotation.phase !== annotations[ply - 1].phase
      ? [{ ply, phase: annotation.phase }]
      : [],
  );
}
