import { markKinds } from "./coverage";
import type { PersonalMark } from "../../types";

/**
 * What the Player has written on a Move, shown **in the move list** — so a
 * reading is locatable at a glance instead of by stepping through seventy-six
 * Moves to find where one wrote.
 *
 * Three distinct glyphs, each with its **own accessible name**: the three kinds
 * have to be told apart from one another, not merely distinguished from silence.
 * The glyph carries the meaning and the name says it in words — no tint is the
 * only cue (ADR-0013).
 *
 * Deliberately **not** the engine's severity glyph vocabulary (`??`, `?`, `?!`):
 * on this route nothing comes from the engine, and borrowing its marks would
 * suggest a measured verdict where there is only a declared one.
 */
export function MoveMarks({ marks, ply }: { marks: PersonalMark[]; ply: number }) {
  const { verdict, note, keyMoment } = markKinds(marks, ply);
  if (!verdict && !note && !keyMoment) return null;

  return (
    <span data-part="move-marks">
      {verdict && <span aria-label="verdict posé">✎</span>}
      {note && <span aria-label="note écrite">✐</span>}
      {keyMoment && <span aria-label="moment clé">◆</span>}
    </span>
  );
}
