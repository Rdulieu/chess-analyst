import { readingLabel } from "./readingLabel";
import type { MoveReading, PersonalMark } from "../../types";

/**
 * **What the Player's reading was worth on the Move they are looking at**
 * (US-26, ADR-0033) — the cartouche, its sentence, and the note they wrote
 * there.
 *
 * This is what turns a rate into something auditable. "38 % — 3 sur 8" is a
 * verdict the Player has to take on trust until they can walk the Game and see
 * *which* Move produced *which* cell; this block is the seeing.
 *
 * **Three cues, none of them alone** (ADR-0013): the tone carries a colour, the
 * label says the case in words that read without it, and the sentence below
 * explains. `data-tone` is a hook for the sheet and never the accessible name.
 *
 * It sits **below** the step controls and the current-Move readout, which is
 * ADR-0021: everything that appears and disappears with the ply goes under the
 * buttons the Player is clicking, never above them.
 */
export function MoveReadout({
  move,
  marks,
}: {
  /** The reading of the current ply, or `null` at the starting Position. */
  move: MoveReading | null;
  /** The sealed marks, for the note the Player wrote on this Move. */
  marks: PersonalMark[];
}) {
  // Ply 0 is nobody's Move: there is no reading of it to show, and inventing a
  // neutral cartouche there would put a block on screen that says nothing.
  if (!move) return null;

  const { tone, label, detail } = readingLabel(move);
  /*
   * The **sealed** note, and only that one. `markKinds` answers whether a note
   * exists, not what it says, and it deliberately merges the two layers — right
   * for a glyph in the list, wrong here. What this block sets against the
   * engine's verdict is the reasoning the Player had written *before* seeing
   * it; a note added afterwards belongs to the posterior layer, which is shown
   * as such and enters no comparison.
   */
  const note = marks.find((mark) => mark.ply === move.ply && !mark.posterior)?.note ?? null;

  return (
    <div data-part="move-reading">
      {/* The label is the accessible name of the cartouche, because the label
          IS the explanation — that is why the table is parameterised by case
          and why the screen carries no legend. */}
      <p data-part="reading-term" data-tone={tone}>
        {label}
      </p>
      <p data-part="reading-detail">{detail}</p>
      {note && (
        /* The Player's own words, in front of the engine's verdict. This is the
           reason the reading is written down at all: re-reading one's reasoning
           beside what was measured is where the learning happens, and it cannot
           happen if the note lives on another screen. */
        <p data-part="reading-note">
          <span data-part="note-label">Ce que j'avais écrit</span> : « {note} »
        </p>
      )}
    </div>
  );
}
