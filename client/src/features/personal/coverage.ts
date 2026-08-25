import type { PersonalMark } from "../../types";

/** How much of a Game the Player has examined, with the raw figures beside the share. */
export interface Coverage {
  /** Moves carrying at least one mark. */
  examined: number;
  /** Moves in the Game — the starting Position excluded, it is not a Move. */
  moves: number;
  /** `examined / moves`, or 0 on a Game with no Moves. */
  share: number;
}

/**
 * **Coverage** (US-16a): the share of Moves the Player has already examined. It is
 * the figure that says whether a reading is far enough along to be sealed — and
 * the **same fact** US-16b will report *beside* correctness, never folded into it.
 * Keeping them apart is the whole reason silence has no row: coverage counts what
 * was looked at, correctness judges what was said.
 *
 * A Move counts **once**, however many things were said about it and in whichever
 * layer: this counts Moves looked at, not marks written.
 *
 * The **count travels with the rate**, the project's constant habit — a share on
 * its own hides whether it rests on two Moves or on forty, and the Player is the
 * one who should judge that.
 */
export function coverage(marks: PersonalMark[], moves: number): Coverage {
  // Ply 0 is the starting Position: a `Note` about the Game as a whole is not a
  // Move examined, and counting it would put coverage above 100% on a Game whose
  // every Move was marked.
  const examined = new Set(marks.filter((m) => m.ply > 0).map((m) => m.ply)).size;
  return { examined, moves, share: moves === 0 ? 0 : examined / moves };
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
