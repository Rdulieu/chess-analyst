import type { PersonalMark } from "../../types";

/**
 * The `Note` the Player wrote on the **starting Position** — their note about the
 * Game as a whole, or about its opening.
 *
 * Shown from **anywhere in the Game**, read-only, because that is what it is
 * about. Written at ply 0, it was previously legible only from ply 0: a note about
 * the whole Game that disappears as soon as the Player starts reading the Game is
 * a note they will not remember writing.
 *
 * Absent entirely when there is none — an empty panel announcing an absence is
 * noise, and silence stays silent here as everywhere else in the reading.
 */
export function WholeGameNote({ marks, ply }: { marks: PersonalMark[]; ply: number }) {
  // At the starting Position the editor itself is on screen, holding this very
  // text: repeating it there would put the same words twice on one pane.
  if (ply === 0) return null;
  const notes = marks.filter((m) => m.ply === 0 && m.note !== null);
  if (notes.length === 0) return null;

  return (
    <fieldset data-part="whole-game-note" aria-label="Ma note sur la partie">
      <legend>Ma note sur la partie</legend>
      {notes.map((mark) => (
        <p key={String(mark.posterior)} data-part="sealed-note">
          {mark.note}
          {/* Which layer it belongs to, in words: a note added after the seal is
              kept and shown, and never passed off as part of the sealed reading. */}
          {mark.posterior && <em> (après le scellement)</em>}
        </p>
      ))}
    </fieldset>
  );
}
