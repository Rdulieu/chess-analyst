import type { UncountedReason } from "../../chess/counted";
import { OPPORTUNITY_TERM } from "../../chess/opportunity";
import { SEVERITY_LABEL } from "../../chess/severity";
import type { GameRecap, Opportunity } from "../../types";

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

/** The order the severities are always listed in — worst last, the glossary's
 *  own order, so two Games read alike and nothing has to be re-sorted by eye. */
const OPPORTUNITY_SEVERITIES: Opportunity["severity"][] = ["inaccuracy", "mistake", "blunder"];

/**
 * The breakdown, **in the words the bands already own**. Lower-cased from
 * `SEVERITY_LABEL` for the same reason `opportunityName` does it: the severity is
 * a *property* of the `Opportunity` — *une `Opportunity` de la taille d'une
 * bévue* — and the three capitalised names stay reserved for the Player's own
 * Moves. A second table here would be free to drift the day one of the three is
 * renamed.
 *
 * The term itself stays **invariable in the plural** (« 3 `Opportunity` »): it is
 * a defined term of this project's vocabulary, not a French common noun.
 */
function breakdown(bySeverity: GameRecap["opportunities"]["bySeverity"]): string {
  return OPPORTUNITY_SEVERITIES.filter((severity) => bySeverity[severity] > 0)
    .map((severity) => {
      const count = bySeverity[severity];
      const word = SEVERITY_LABEL[severity].toLowerCase();
      return `${count} de la taille d'une ${word}`;
    })
    .join(", ");
}

export function GameRecapReadout({
  recap,
  showOpportunities = false,
}: {
  recap: GameRecap;
  /**
   * Whether this recap also states what the **opponent** offered (US-30,
   * ADR-0034). **Off by default**, like `Board`'s prop of the same name and for
   * the same reason: the screen asks, the payload never decides. A caller that
   * says nothing gets a recap about the Player and only the Player.
   */
  showOpportunities?: boolean;
}) {
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
      {/*
        **Beside the Player's counts, and in none of them** (ADR-0034). Its own
        paragraph, its own hook, its own sentence: a count of the opponent's flaws
        added to « Erreurs comptées » is the exact contamination the whole story
        exists against, and the separation has to be visible on screen and not
        only true in the model.

        Its subject is named in words before any figure — the reader is told whose
        Moves are being counted *before* being given a number. `data-opportunity`
        is deliberately absent here: there is no severity to hook, and the
        attribute that would carry one is the one the sheet tints in the Player's
        fault colours.

        Always rendered once opted in, zero included. « Aucune » is a fact about
        the Game; a paragraph that comes and goes would make the panel's height
        depend on the Game (ADR-0021) and would leave the Player unable to tell
        « none » from « not measured ».
      */}
      {showOpportunities && (
        <p data-part="recap-opportunities">
          Ce que l'adversaire a laissé sur la table :{" "}
          <strong>{recap.opportunities.total}</strong> {OPPORTUNITY_TERM}
          {recap.opportunities.total === 0 ? (
            " — la partie n'en a offert aucune."
          ) : (
            <> — {breakdown(recap.opportunities.bySeverity)}.</>
          )}
        </p>
      )}
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
