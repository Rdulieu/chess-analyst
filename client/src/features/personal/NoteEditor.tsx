import { useEffect, useRef, useState } from "react";

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
 * **It is committed when the Player leaves it** — on blur, and on changing Move
 * (US-22). Not on every keystroke: a Note is a sentence being composed, and a
 * half-typed thought is not a thought the Player asked to keep. That distinction
 * was the reason for the explicit button, and it survives the button's removal —
 * "being composed" stays true while one writes and stops the moment one leaves.
 *
 * What the button was actually costing was **data**. The draft was local state
 * reset to the stored value as soon as the ply changed, so typing a Note and
 * clicking `Next` lost it in silence, with nothing warning and nothing holding
 * it. That is the grief, not the extra click.
 *
 * **Erasing stays explicit.** Emptying the box and walking away commits nothing:
 * that is the behaviour the disabled `Enregistrer` button had, and turning an
 * accidental select-and-delete into a silent erasure would be the same class of
 * loss, in reverse. A Note is unsaid on purpose, by its own button.
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

  /*
   * What was last **committed** for the ply currently on screen, kept where the
   * effect cleanup below can still read it.
   *
   * Written from an effect and never during render, and the difference is the
   * whole correctness of this component. React renders the new ply *before* it
   * runs the old ply's cleanup, so a ref assigned during render already holds
   * the NEW Move's stored Note by the time the cleanup asks — which reads as
   * "this ply had text and nothing stored" and files the previous Move's Note
   * on it. An effect runs after the cleanup, so this still holds the old ply's
   * values exactly when they are needed. (Caught by the FP of 2026-08-28, on the
   * emptied-and-left probe: `{ draft: "à revoir", note: null }`.)
   *
   * No dependency array on purpose: every commit is a new truth about what is on
   * screen, including each keystroke.
   */
  const pending = useRef({ draft: note ?? "", note });
  useEffect(() => {
    pending.current = { draft, note };
  });

  // The Move being read changed, or the stored Note did: the field follows it.
  // Keyed on `ply` too, so stepping to another Move never leaves the previous
  // Move's text sitting in the box.
  useEffect(() => setDraft(note ?? ""), [ply, note]);

  /*
   * Leaving this ply commits what was written on it. The cleanup of an effect
   * keyed on `ply` is the one place that runs with the *old* ply still in scope,
   * which is what lets the write be addressed to the Move it was written about.
   */
  useEffect(() => {
    return () => {
      const { draft: left, note: stored } = pending.current;
      if (worthSaving(left, stored)) onSave(left);
    };
    // `onSave` is deliberately not a dependency: it is rebuilt on every render of
    // the route, and depending on it would fire this cleanup on every render
    // rather than on leaving the Move.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ply]);

  const about = ply === 0 ? "la partie" : "ce coup";
  const label = `Ma note sur ${about}` + (posterior ? ", après le scellement" : "");
  const dirty = worthSaving(draft, note);

  return (
    <div data-part="note">
      <label>
        {label}
        <textarea
          value={draft}
          rows={3}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (dirty) return onSave(draft);
            // Emptied and left: the stored Note is safe, and the screen has to
            // look like it. Left as it was, the box was empty, the line said
            // "Note enregistrée." and the erase button was live — three things
            // that cannot all be true, in exactly the moment a Player is most
            // afraid of having lost something. Putting the text back is what
            // makes "erasing is its own act" visible rather than merely true.
            if (draft.trim() === "" && note !== null) setDraft(note);
          }}
        />
      </label>
      {/* In the screen, not only in the vocabulary: the Player is about to write
          the one thing here that is theirs alone, and telling them it is not
          being marked is what makes them willing to write it. */}
      <p data-part="never-graded">Les notes ne sont jamais notées.</p>
      {/*
        The state of the Note, always rendered and never appearing or vanishing.
        A confirmation that comes and goes would re-create, three slices later,
        the very defect this story spent slice 02 closing (ADR-0021) — and it
        would do it under the Player's own hands, since the erase button sits
        directly below. So the element is constant and only its words change; all
        three fit one line in the panel's column.
      */}
      <p data-part="note-state">{stateOf(draft, note, about)}</p>
      <div data-part="note-actions">
        <button type="button" disabled={disabled || note === null} onClick={onErase}>
          Supprimer la note
        </button>
      </div>
    </div>
  );
}

/**
 * Whether what is in the box is worth writing down.
 *
 * Empty is **not**: erasing is its own act, with its own button. A blank draft
 * over a stored Note means the Player deleted the text and may simply be about
 * to type again — committing that would erase by inattention, which is the same
 * loss this slice exists to close, only pointing the other way.
 */
function worthSaving(draft: string, note: string | null): boolean {
  return draft.trim() !== "" && draft.trim() !== (note ?? "");
}

/**
 * What the screen says about the Note, in words — three states, one line each.
 *
 * It says what the field is **about**, like the label does. At the starting
 * Position the field is the Note on the whole Game, and a state line still
 * saying "ce coup" under a label saying "la partie" contradicted it.
 */
function stateOf(draft: string, note: string | null, about: string): string {
  if (worthSaving(draft, note)) return "Enregistrée en quittant le champ.";
  if (note !== null) return "Note enregistrée.";
  return `Aucune note sur ${about}.`;
}
