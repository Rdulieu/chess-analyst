import type { PersonalMark } from "../../types";

/** How far the Player has got in writing their reading, figures beside the share. */
export interface ReadingProgress {
  /** Moves carrying at least one mark. */
  annotated: number;
  /** Moves in the Game — the starting Position excluded, it is not a Move. */
  moves: number;
  /** `annotated / moves`, or 0 on a Game with no Moves. */
  share: number;
}

/**
 * **How far the reading has got** (US-16a): the share of the Game's Moves the
 * Player has written something on. It is the figure that says whether a reading
 * is advanced enough to seal.
 *
 * **It is deliberately not the `Confrontation`'s coverage, and no longer shares
 * its name.** CONTEXT.md reserves *coverage* for a share of the Player's
 * **`Counted Move`s** — the same denominator accuracy uses, so the two figures
 * can be read together. This one runs over **every half-move of the Game**, the
 * opponent's included, because writing a `Note` on the opponent's Move is
 * progress in a reading even though nothing will ever score it. Two honest
 * figures on two denominators; one word for both would have manufactured a
 * divergence out of vocabulary alone.
 *
 * A Move counts **once**, however many things were said about it and in whichever
 * layer: this counts Moves written on, not marks written.
 *
 * The **count travels with the rate**, the project's constant habit — a share on
 * its own hides whether it rests on two Moves or on forty, and the Player is the
 * one who should judge that.
 */
export function readingProgress(marks: PersonalMark[], moves: number): ReadingProgress {
  // Ply 0 is the starting Position: a `Note` about the Game as a whole is not a
  // Move written on, and counting it would put this above 100% on a Game whose
  // every Move was marked.
  const annotated = new Set(marks.filter((m) => m.ply > 0).map((m) => m.ply)).size;
  return { annotated, moves, share: moves === 0 ? 0 : annotated / moves };
}

/** Which kinds of mark a ply carries — the three, told apart. */
export interface MarkKinds {
  verdict: boolean;
  note: boolean;
  keyMoment: boolean;
}

/**
 * What the Player has written on one ply, **both layers folded together**: the
 * move list answers *where did I write*, and a Move written on after the seal is
 * still a Move written on. Which layer it was is the reading panel's business,
 * not the list's.
 */
export function markKinds(marks: PersonalMark[], ply: number): MarkKinds {
  const onPly = marks.filter((m) => m.ply === ply);
  return {
    verdict: onPly.some((m) => m.declaredSeverity !== null),
    note: onPly.some((m) => m.note !== null),
    keyMoment: onPly.some((m) => m.keyMoment),
  };
}
