import { DECLARED_SEVERITY_LABEL } from "./declaredSeverity";
import type { PersonalMark } from "../../types";

/**
 * What a **sealed** reading says about itself: when it was sealed, and — the part
 * that makes a later confrontation honest — whether the engine's findings had
 * already been shown for this Game.
 *
 * The label is **read unaided** or **read informed**, in those words. It is a
 * **provenance, not a lock**: nothing here claims the app kept the Player blind,
 * because it cannot (another tab is a click away) and claiming otherwise would
 * sell a guarantee it cannot keep — the very promise the glossary refused when it
 * rejected the name *Blind mode*. So the sentence says what was observed and what
 * that is worth, and stops there.
 */
export function SealedReadout({
  sealedAt,
  engineSeenBeforeSeal,
}: {
  sealedAt: string;
  engineSeenBeforeSeal: boolean | null;
}) {
  const informed = engineSeenBeforeSeal === true;
  return (
    <div data-part="sealed">
      <p>
        Lecture scellée le <strong>{new Date(sealedAt).toLocaleString("fr-FR")}</strong>.
      </p>
      {/* In words, never by colour alone, and never as a verdict on the Player:
          it says what the app saw, not how good the reading is. */}
      <p data-part="provenance">
        <strong>{informed ? "Lue informée" : "Lue à l'aveugle"}</strong> —{" "}
        {informed
          ? "l'analyse du moteur avait déjà été affichée pour cette partie avant le scellement."
          : "l'analyse du moteur n'avait pas été affichée pour cette partie avant le scellement."}
      </p>
      {engineSeenBeforeSeal === null && (
        <p data-part="provenance-unknown">
          La provenance de cette lecture n'a pas été enregistrée.
        </p>
      )}
    </div>
  );
}

/**
 * What the Player had written on this Move **when they sealed** — shown beside
 * what they have written since, never replaced by it. This is the whole point of
 * the seal: the initial reading stays readable exactly as it was, so the
 * confrontation is against what was actually thought first.
 *
 * Read-only by construction: there is no control here, because the sealed layer
 * takes no more writing.
 */
export function SealedMarkReadout({ mark }: { mark: PersonalMark | undefined }) {
  if (!mark) return null;

  return (
    <fieldset data-part="sealed-mark" aria-label="Ma lecture scellée de ce coup">
      <legend>Ma lecture scellée de ce coup</legend>
      {mark.declaredSeverity && (
        <p>
          Verdict : <strong>{DECLARED_SEVERITY_LABEL[mark.declaredSeverity]}</strong>
        </p>
      )}
      {mark.keyMoment && <p>Marqué comme moment clé.</p>}
      {/* `pre-wrap` in the sheet: the line breaks the Player typed are part of
          what they wrote, and this is the layer that must read as it was. */}
      {mark.note && <p data-part="sealed-note">{mark.note}</p>}
      {!mark.declaredSeverity && !mark.keyMoment && !mark.note && (
        <p>Rien n'avait été écrit sur ce coup avant le scellement.</p>
      )}
    </fieldset>
  );
}
