import { DECLARED_SEVERITY_LABEL } from "../personal/declaredSeverity";
import type { GameConfrontation, PosteriorMark, UncountedMove, UncountedReason } from "../../types";

/** How a ply is named to the Player: the Move number and the side. */
function moveName(ply: number): string {
  return `${Math.ceil(ply / 2)}${ply % 2 === 1 ? "." : "…"}`;
}

/** Why a Move is excluded, said in the Player's own terms. */
const REASON: Record<UncountedReason, { label: string; why: string }> = {
  forced: {
    label: "Coup forcé",
    why: "il n'y avait pas d'autre coup légal : jouer le seul coup possible ne vaut ni crédit ni reproche.",
  },
  decided: {
    label: "Position déjà décidée",
    why: "il ne restait plus assez à perdre pour qu'un coup dise quelque chose de votre jeu.",
  },
};

/**
 * Everything the `Confrontation` **shows without scoring it** — and which, left
 * out, would make a correct gap look like a bug.
 *
 * A Game where the Player played four `Blunder`s can legitimately contribute
 * **zero** counted errors: all four came after the Game was already lost, where
 * there was nothing left to lose. A page showing "4 bévues" beside figures that
 * counted none of them destroys the Player's trust precisely at the point where
 * the discrepancy is the thing needing explanation (ADR-0017). The exclusion
 * reasons exist so that gap is **readable** instead of looking like a defect.
 *
 * Renders **nothing at all** when there is nothing to show: a section headed
 * "not scored" over an empty list sends the Player hunting for what is not there.
 */
export function UnscoredReadout({ confrontation }: { confrontation: GameConfrontation }) {
  const { uncounted, posterior } = confrontation;
  const { good, opponent } = confrontation.severity.unscored;

  if (uncounted.length === 0 && good === 0 && opponent === 0 && posterior.length === 0) {
    return null;
  }

  const byReason = groupByReason(uncounted);

  return (
    <div data-part="unscored-section">
      <h3>Montré, jamais noté</h3>
      <p data-part="unscored-lead">
        Ce que votre lecture dit ici est conservé et affiché, et n'entre dans aucun des chiffres
        ci-dessus. La raison n'est pas la même à chaque fois, et c'est elle qui compte.
      </p>

      {byReason.map(([reason, moves]) => (
        <section key={reason} data-uncounted={reason}>
          <h4>
            {REASON[reason].label} — {moves.length}
          </h4>
          <p>{REASON[reason].why}</p>
          <ul>
            {moves.map((move) => (
              <li key={move.ply}>
                {moveName(move.ply)}
                {move.declared ? (
                  <>
                    {" — vous aviez dit "}
                    <strong>{DECLARED_SEVERITY_LABEL[move.declared]}</strong>
                    {/* The case that settles the denominator: `Sound` on a forced
                        catastrophe is RIGHT, and a naive matrix would count it
                        wrong. Saying so outright is the point of showing it. */}
                    {", et ce n'est pas noté — ni pour vous, ni contre vous."}
                  </>
                ) : (
                  " — vous n'aviez rien dit ici."
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {good > 0 && (
        <p data-unscored="good">
          <strong>Bon</strong> : {good}. Le moteur ne flague que les coups fautifs et n'a aucune
          bande pour le mérite — il n'y a donc rien à opposer à ce verdict. Il compte dans ce que
          vous avez examiné, pas dans ce que vous avez vu juste.
        </p>
      )}

      {opponent > 0 && (
        <p data-unscored="opponent">
          <strong>Verdicts sur les coups de l'adversaire</strong> : {opponent}. Gardés et montrés,
          jamais notés — non faute de moyens, mais parce que cet outil porte sur votre propre
          progrès.
        </p>
      )}

      {posterior.length > 0 && <PosteriorLayer marks={posterior} />}
    </div>
  );
}

/**
 * What the Player wrote **after the seal**. Shown as its own layer and said to be
 * outside the comparison — placing it elsewhere is not enough, it has to be
 * named as such.
 *
 * It exists because seeing the engine and understanding why is the most fertile
 * moment of the whole exercise: forbidding it would be absurd, and counting it
 * would be dishonest.
 */
function PosteriorLayer({ marks }: { marks: PosteriorMark[] }) {
  return (
    <section data-part="posterior">
      <h4>Écrit après le scellement — {marks.length}</h4>
      <p>
        Ce que vous avez ajouté <strong>après avoir vu le moteur</strong>. C'est le moment le plus
        fertile de l'exercice, et c'est pour ça que rien ici n'entre dans la confrontation : le
        compter serait malhonnête, l'interdire serait absurde.
      </p>
      <ul>
        {marks.map((mark, i) => (
          <li key={`${mark.ply}-${i}`}>
            {moveName(mark.ply)}
            {mark.declaredSeverity && ` — ${DECLARED_SEVERITY_LABEL[mark.declaredSeverity]}`}
            {mark.keyMoment && " — moment clé"}
            {mark.note && ` — « ${mark.note} »`}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The excluded Moves, **grouped by reason and never merged**. The order is fixed
 * rather than data-driven so two Games read the same way.
 */
function groupByReason(uncounted: UncountedMove[]): [UncountedReason, UncountedMove[]][] {
  const reasons: UncountedReason[] = ["forced", "decided"];
  return reasons
    .map((reason): [UncountedReason, UncountedMove[]] => [
      reason,
      uncounted.filter((move) => move.reason === reason),
    ])
    .filter(([, moves]) => moves.length > 0);
}
