import { useState } from "react";

/**
 * **Sealing** a `Personal analysis` (CONTEXT.md): *this is my reading, now show
 * me the engine.*
 *
 * It does two things and only two — it **fixes what will be confronted**, and it
 * **dates** the reading. The confirmation names both, because a Player who sealed
 * by reflex would find their reading frozen without having chosen it.
 *
 * It also **says what sealing leads to**, before it is done: the `Confrontation`
 * comes after the seal, and a Player who does not know that has no reason to seal
 * (US-23, D7).
 *
 * The idiom is the app's existing one for an act that cannot be undone — an
 * in-page `role="alertdialog"` card naming what it commits, with **Cancel as the
 * primary action** — the same shape as re-analysing a Game or deleting a
 * `Profile`. Same class of act, same card.
 *
 * There is deliberately **no counterpart**. Nothing here unseals, because a
 * reading that could be reopened would no longer be what the Player had written,
 * and the confrontation would be worthless.
 *
 * An **empty** reading is refused *before* the confirmation rather than after: a
 * dialog about an act that is going to fail only teaches the Player to dismiss
 * dialogs.
 */
export function SealAction({
  empty,
  sealing,
  onSeal,
}: {
  /** Nothing has been written yet, so there would be nothing to confront. */
  empty: boolean;
  sealing: boolean;
  onSeal: () => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div data-part="seal">
      <button
        type="button"
        disabled={empty || sealing}
        onClick={() => setConfirming(true)}
      >
        Sceller ma lecture
      </button>
      {empty && (
        // The reason, beside the refusal. "Disabled" on its own says only that
        // something is wrong, never what.
        <p data-part="seal-blocked">
          Rien à confronter pour l'instant : posez au moins un verdict, une note ou un moment clé.
        </p>
      )}
      {/* What sealing LEADS TO, said before it is done (US-23, D7). Before the
          seal nothing is fixed to confront, and that stays true — so this is a
          sentence and never a greyed-out control: the same idiom as the refusal
          above, for the same reason. What was missing was not confronting an
          unfinished reading, it was knowing the confrontation exists and when. */}
      <p data-part="seal-leads-to">
        Après le scellement, vous pourrez confronter votre lecture à l'analyse du moteur.
      </p>

      {confirming && (
        <div role="alertdialog" aria-label="confirmer : sceller ma lecture" className="card">
          <p>
            Sceller votre lecture ? Ce que vous avez écrit est <strong>figé</strong> : c'est
            exactement cela qui sera confronté à l'analyse du moteur, et une lecture scellée ne peut
            pas être descellée — c'est <strong>définitif</strong>.
          </p>
          <p>
            Vous pourrez continuer à écrire après : ce que vous ajouterez sera conservé et signalé
            comme <strong>postérieur</strong>, à côté de votre lecture initiale.
          </p>
          <p data-part="actions">
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                void onSeal();
              }}
            >
              Sceller
            </button>
            {/* Primary, because the safe choice is the one a reflex should land on. */}
            <button type="button" data-action="primary" onClick={() => setConfirming(false)}>
              Annuler
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
