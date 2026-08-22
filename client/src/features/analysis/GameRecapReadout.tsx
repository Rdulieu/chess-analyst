import type { GameRecap } from "../../types";

/** A chances figure, in points, with at most one decimal — enough to add up on
 *  screen, not so much as to claim a precision the heuristics do not have. */
const points = (value: number) => `${Math.round(value * 10) / 10} %`;

/**
 * What this Game **contributes** to the analysis (ADR-0017), read at the **head
 * of the panel**: it is what the Player checks the method against, and everything
 * below it is that claim's Move-by-Move proof.
 *
 * The figures are not this component's own arithmetic — they come from the single
 * derivation the aggregate of US-15c will fold. A summary computed here would be
 * a second implementation of the method, and two implementations agree only by
 * luck.
 *
 * It also **absorbs the error tally** at this level. The two counts can
 * legitimately differ by one — a flagged Move that was forced is shown by the
 * Game and held against nobody — and two correct summaries disagreeing side by
 * side read as a bug. So this states both, **and the reason for the gap**.
 */
export function GameRecapReadout({ recap }: { recap: GameRecap }) {
  const gap = recap.flaggedMoves - recap.countedErrors;

  return (
    <section aria-labelledby="game-recap-heading" className="card" data-part="recap">
      <h3 id="game-recap-heading">Ce que cette partie apporte à l'analyse</h3>
      <p>
        <strong>{recap.countedMoves}</strong> de vos <strong>{recap.playerMoves}</strong> coups
        comptent ({recap.countedMoves} / {recap.playerMoves}).
      </p>
      <p>
        Exclus : <strong>{recap.excluded.forced}</strong> parce que forcé
        {recap.excluded.forced > 1 ? "s" : ""}, <strong>{recap.excluded.decided}</strong> parce que
        la position était déjà décidée.
      </p>
      <p>
        Erreurs comptées : <strong>{recap.countedErrors}</strong>
        {gap > 0 && (
          <>
            {" "}
            — la partie en montre <strong>{recap.flaggedMoves}</strong>, dont {gap} signalée
            {gap > 1 ? "s" : ""} mais non comptée{gap > 1 ? "s" : ""} : le coup était forcé.
          </>
        )}
      </p>
      <p>
        Chances perdues : <strong>{points(recap.chancesLost)}</strong> — dont{" "}
        {points(recap.flaggedLoss)} sur vos erreurs signalées et{" "}
        <strong>{points(recap.drift)}</strong> de dérive (ce qu'aucune erreur signalée n'explique).
      </p>
      <p data-part="regime">
        {recap.regime
          ? `Analyse : profondeur ${recap.regime.depth}, ${recap.regime.lines} ligne${
              recap.regime.lines > 1 ? "s" : ""
            }.`
          : "Analyse : régime inconnu."}
      </p>
    </section>
  );
}
