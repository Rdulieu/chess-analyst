import { DECLARED_SEVERITY_GLYPH, DECLARED_SEVERITY_LABEL } from "./declaredSeverity";
import { markKinds } from "./progress";
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
 * The three families stay visibly apart — a severity mark, a pencil, a diamond.
 * The first pair tried here were two pencils (`✎` and `✐`), which the accessible
 * names told apart perfectly and the eye did not at all: at 16 px they read as the
 * same mark, which defeats the entire purpose of putting them in the list.
 *
 * **The verdict says WHICH, since US-22.** It used to be a single `⚖` meaning
 * *a verdict exists here*, and the Player had to open the Move to learn which one
 * — so the list said where they had written and never what they had said. The
 * five values now carry the marks of `DECLARED_SEVERITY_GLYPH`, and the list
 * becomes the overview of a whole reading without a single block being added to
 * the panel this story is busy lightening.
 */
export function MoveMarks({ marks, ply }: { marks: PersonalMark[]; ply: number }) {
  const { verdict, note, keyMoment } = markKinds(marks, ply);
  if (!verdict && !note && !keyMoment) return null;

  return (
    <span data-part="move-marks">
      {verdict && (
        // Named by its own value: "verdict : Correct" tells a screen-reader user
        // exactly what the sighted reader gets from the mark, and `Correct` is
        // the one that most needs saying — a Move examined and found sound is
        // not a Move nobody looked at (**silence is not a value**).
        <span aria-label={`verdict : ${DECLARED_SEVERITY_LABEL[verdict]}`}>
          {DECLARED_SEVERITY_GLYPH[verdict]}
        </span>
      )}
      {note && <span aria-label="note écrite">✎</span>}
      {keyMoment && <span aria-label="moment clé">◆</span>}
    </span>
  );
}
