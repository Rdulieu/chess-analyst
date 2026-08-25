import { useEffect, useState } from "react";

/**
 * The Player's `Note` on the Move being read (CONTEXT.md): free text, where they
 * say **why** they think what they think.
 *
 * **Nothing ever grades a Note**, and the screen says so rather than leaving it
 * in the glossary. That is not a caveat, it is the Note's worth: it is the one
 * part of a `Personal analysis` deliberately not comparable to anything the
 * engine produces — the place the Player thinks, not the place they are scored.
 *
 * On the **starting Position** (ply 0) it is the Note about the Game as a whole,
 * or about its opening. Same field, same convention as an `Evaluation`, where the
 * initial Position counts.
 *
 * Saved on an explicit act rather than on every keystroke: a Note is a sentence
 * being composed, and a half-typed thought is not a thought the Player asked to
 * keep.
 */
export function NoteEditor({
  ply,
  note,
  disabled = false,
  posterior = false,
  onSave,
  onErase,
}: {
  ply: number;
  note: string | null;
  disabled?: boolean;
  /** Whether this field writes into the layer posterior to the seal — said in
   *  the label, so the layer is legible at the control itself. */
  posterior?: boolean;
  onSave: (note: string) => void;
  onErase: () => void;
}) {
  const [draft, setDraft] = useState(note ?? "");

  // The Move being read changed, or the stored Note did: the field follows it.
  // Keyed on `ply` too, so stepping to another Move never leaves the previous
  // Move's text sitting in the box.
  useEffect(() => setDraft(note ?? ""), [ply, note]);

  const label =
    (ply === 0 ? "Ma note sur la partie" : "Ma note sur ce coup") +
    (posterior ? ", après le scellement" : "");
  const dirty = draft.trim() !== (note ?? "");

  return (
    <div data-part="note">
      <label>
        {label}
        <textarea
          value={draft}
          rows={3}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
        />
      </label>
      {/* In the screen, not only in the vocabulary: the Player is about to write
          the one thing here that is theirs alone, and telling them it is not
          being marked is what makes them willing to write it. */}
      <p data-part="never-graded">Les notes ne sont jamais notées.</p>
      <div data-part="note-actions">
        <button
          type="button"
          disabled={disabled || !dirty || draft.trim() === ""}
          onClick={() => onSave(draft)}
        >
          Enregistrer la note
        </button>
        <button type="button" disabled={disabled || note === null} onClick={onErase}>
          Supprimer la note
        </button>
      </div>
    </div>
  );
}
