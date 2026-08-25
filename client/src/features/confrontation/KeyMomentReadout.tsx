import type { KeyMomentMiss, KeyMomentReading } from "../../types";

/** How a ply is named to the Player: the Move number and the side. */
function moveName(ply: number): string {
  return `${Math.ceil(ply / 2)}${ply % 2 === 1 ? "." : "…"}`;
}

/** Points of winning chances, as they are written everywhere else in the app. */
function points(value: number): string {
  return `${Math.round(value)} points`;
}

/**
 * **Where the Player looked** — the `Confrontation`'s second reading, and never
 * folded into the first. Their disagreement is the diagnosis: strong here and
 * weak on `Declared severity`s means the Player sees *where* a Game turns but
 * cannot yet name *what* happens there, and a single figure would have erased
 * that. "My strengths and weaknesses **in analysis**" is plural on purpose.
 *
 * One division, in the currency everything else here already uses: the chances
 * lost by the flagged Moves the markers point at, over those lost by **all** the
 * Player's flagged Moves. No new scale, no new threshold.
 *
 * Renders nothing when no `Key moment` was posed — an empty figure headed "where
 * I looked" says the Player looked nowhere, which is a different claim.
 */
export function KeyMomentReadout({ keyMoments }: { keyMoments: KeyMomentReading }) {
  const { marked, damageFound, damageTotal, drift, misses } = keyMoments;
  if (marked === 0) return null;

  return (
    <fieldset data-part="figure" aria-label="Où j'ai regardé">
      <legend>Où j'ai regardé</legend>
      <p data-part="figure-value">
        {damageTotal === 0 ? (
          // NOT a zero. A zero would make a sound reading look like a failed one
          // — the Player pointed somewhere, and there was simply nothing to find.
          <strong>Pas de score</strong>
        ) : (
          <>
            <strong>{Math.round((damageFound / damageTotal) * 100)} %</strong> des dégâts trouvés —{" "}
            {points(damageFound)} sur {points(damageTotal)} perdus par vos coups fautifs
          </>
        )}
      </p>
      {damageTotal === 0 && (
        <p data-part="figure-note">
          Vous cherchiez une faute, il n'y en avait pas : aucun de vos coups n'a été flagué sur
          cette partie. Il n'y a donc rien à trouver, et pas de score à en tirer.
        </p>
      )}
      <p data-part="figure-note">
        Vos {marked === 1 ? "moment clé" : "moments clés"} sont confrontés à{" "}
        <strong>vos propres coups fautifs</strong>, jamais au plus gros écart de la partie — celui-ci
        peut être une bévue de l'adversaire, et manquer un cadeau n'apprend rien.
      </p>
      <Drift drift={drift} />
      {misses.map((miss) => (
        <Miss key={miss.ply} miss={miss} />
      ))}
    </fieldset>
  );
}

/**
 * The `Drift`, **beside the figure and outside the division**. Out because Drift
 * has no Move to point at, so counting it would put 100% beyond the reach of a
 * perfect reading. Beside because that is where it teaches most: a Game lost by
 * bleeding had no fault to find, and saying so is the lesson.
 */
function Drift({ drift }: { drift: number }) {
  if (drift < 1) return null;
  return (
    <p data-part="drift">
      À côté : <strong>{points(drift)}</strong> perdus sans qu'aucun coup flagué en réponde — le
      `Drift`. Il n'entre pas dans la division ci-dessus, parce qu'il n'a{" "}
      <strong>aucun coup à désigner</strong> : l'y mettre placerait 100 % hors d'atteinte d'une
      lecture parfaite.
    </p>
  );
}

/**
 * A marker that found nothing. **No tolerance window**: a `Key moment` one Move
 * from the loss earns no approximate credit — the **distance is shown** instead.
 * That says more than silent partial credit, and it keeps the score additive and
 * free of any magic constant.
 */
function Miss({ miss }: { miss: KeyMomentMiss }) {
  if (miss.nearest === null) {
    return (
      <p data-part="miss">
        Votre marqueur est sur {moveName(miss.ply)}, qui n'a rien coûté — et il n'y avait{" "}
        <strong>aucune faute</strong> à désigner sur cette partie.
      </p>
    );
  }

  const gap = Math.abs(miss.nearest.ply - miss.ply);
  return (
    <p data-part="miss">
      Votre marqueur est sur <strong>{moveName(miss.ply)}</strong>, qui n'a rien coûté — la perte
      est sur <strong>{moveName(miss.nearest.ply)}</strong> ({points(miss.nearest.lost)}),{" "}
      {gap === 1 ? "un demi-coup" : `${gap} demi-coups`} plus loin.
    </p>
  );
}
