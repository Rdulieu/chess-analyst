import type { UncountedReason } from "../../chess/counted";
import type { GameRecap } from "../../types";

/** A chances figure, in points, always to one decimal — enough to add up on
 *  screen, not so much as to claim a precision the heuristics do not have.
 *  Always, so three figures on one line read as one precision rather than as
 *  three. */
const points = (value: number) => `${value.toFixed(1)} %`;

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
/**
 * How the gap names each reason, **in that reason's own words**. The two are
 * never melted into a bare "non comptées": *forced* is a rule of chess, *already
 * decided* is a limit of the metric, and the Player audits neither if the screen
 * will not tell them apart.
 *
 * The `decided` half was unreachable while the flagging band and the denominator
 * floor were the same number — a Position with less than the band left to lose
 * could not produce a flagged Move at all. It is written here **before** it can
 * occur rather than after, because the alternative is a screen that keeps
 * asserting "le coup était forcé" about a Move that was nothing of the kind.
 */
const GAP_REASON: Record<UncountedReason, (count: number) => string> = {
  forced: (count) => (count > 1 ? "parce que les coups étaient forcés" : "parce que le coup était forcé"),
  decided: (count) =>
    count > 1 ? "parce que les positions étaient déjà décidées" : "parce que la position était déjà décidée",
};

/** The order the reasons are always listed in, so two Games read alike. */
const UNCOUNTED_REASONS: UncountedReason[] = ["forced", "decided"];

/** One decimal, as a number — so the parts can be added before being printed. */
const round = (value: number) => Math.round(value * 10) / 10;

export function GameRecapReadout({ recap }: { recap: GameRecap }) {
  // The gap, **as the server broke it down** — not recomputed from the two
  // totals. A subtraction gives a number and no reason, and a number is exactly
  // what this sentence must not be reduced to.
  const shownNotCounted = UNCOUNTED_REASONS.filter(
    (reason) => recap.flaggedUncounted[reason] > 0,
  ).map((reason) => ({ reason, count: recap.flaggedUncounted[reason] }));
  const gap = shownNotCounted.reduce((total, { count }) => total + count, 0);
  /**
   * The two parts are rounded, and the residual is then the **difference of the
   * rounded parts** — not a third independent rounding of the exact drift.
   *
   * The model is exact (`flaggedLoss + drift === chancesLost`), but rounding the
   * three figures separately can leave the sum on screen off by 0.1, and adding
   * the two parts back to the total is precisely what this panel invites the
   * Player to do. A recap whose one checkable claim fails to check is worse than
   * one decimal of drift.
   */
  const lost = round(recap.chancesLost);
  const flagged = round(recap.flaggedLoss);
  const drift = round(lost - flagged);

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
          <span data-part="gap">
            {" "}
            — la partie en montre <strong>{recap.flaggedMoves}</strong>, dont {gap} signalée
            {gap > 1 ? "s" : ""} mais non comptée{gap > 1 ? "s" : ""} :{" "}
            {shownNotCounted
              .map(({ reason, count }) => `${count} ${GAP_REASON[reason](count)}`)
              .join(", ")}
            .
          </span>
        )}
      </p>
      <p>
        Chances perdues : <strong>{points(lost)}</strong> — dont {points(flagged)} sur vos erreurs
        signalées et <strong>{points(drift)}</strong> de dérive (ce qu'aucune erreur signalée
        n'explique).
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
