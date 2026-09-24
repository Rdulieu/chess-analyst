import { PHASE_LABEL, type Phase } from "../../chess/phase";
import { OPPORTUNITY_OFFERED_PHRASE, OPPORTUNITY_TERM } from "../../chess/opportunity";
import type { GameRecap, PhaseDamage } from "../../types";

/** The order the three `Phase`s are always read in — the Game's own order, so
 *  two Games read alike and the table is scanned as a timeline. */
const PHASES: Phase[] = ["early", "middlegame", "endgame"];

/** One decimal, as a number — so the parts can be added before being printed,
 *  which is the whole promise this table makes. */
const round = (value: number) => Math.round(value * 10) / 10;

/** A chances figure on screen, always to one decimal — the same precision the
 *  recap above states, so the two can be compared without conversion. */
const points = (value: number) => `${value.toFixed(1)} %`;

/**
 * What the table prints for one `Phase`, in figures that **add up on screen**.
 *
 * Rounding each band on its own would leave the column off the recap's total by
 * a tenth, and adding the column back to that total is exactly what this table
 * invites the Player to do. So the bands are rounded, and the **residual of the
 * rounding** is carried by the heaviest band — the one where a tenth is least
 * of its own value. It is the same reasoning the recap already applies to its
 * `Drift`: the model is exact, and what must not fail to check is the
 * arithmetic the Player can see.
 */
export interface PrintedBand {
  phase: Phase;
  chancesLost: number;
  flaggedLoss: number;
  drift: number;
}

/**
 * The reached bands, printed so that their `chancesLost` sum to the Game's own
 * rounded total and their `flaggedLoss` to its rounded flagged loss. `drift` is
 * then the **difference of the two printed figures**, never a third rounding,
 * so the identity holds line by line as well as column by column.
 */
export function printedBands(recap: GameRecap): PrintedBand[] {
  const reached = PHASES.filter((phase) => recap.byPhase[phase] !== null);
  const band = (phase: Phase) => recap.byPhase[phase] as PhaseDamage;
  // The band that absorbs the rounding residual: the heaviest, and — on a Game
  // where every band is zero — simply the first, where the residual is zero too.
  const heaviest = reached.reduce(
    (worst, phase) => (band(phase).chancesLost > band(worst).chancesLost ? phase : worst),
    reached[0],
  );

  const settle = (read: (damage: PhaseDamage) => number, total: number) => {
    const printed = new Map(reached.map((phase) => [phase, round(read(band(phase)))]));
    const drawn = [...printed.values()].reduce((sum, value) => sum + value, 0);
    printed.set(heaviest, round((printed.get(heaviest) ?? 0) + (round(total) - drawn)));
    return printed;
  };

  const lost = settle((damage) => damage.chancesLost, recap.chancesLost);
  const flagged = settle((damage) => damage.flaggedLoss, recap.flaggedLoss);

  return reached.map((phase) => {
    const chancesLost = lost.get(phase) ?? 0;
    const flaggedLoss = flagged.get(phase) ?? 0;
    return { phase, chancesLost, flaggedLoss, drift: round(chancesLost - flaggedLoss) };
  });
}

/**
 * **Where** the Game was lost (US-32) — the recap's own figures, located by
 * `Phase`, read directly under the recap and therefore under the controls
 * (ADR-0021: nothing the Player acts on moves when this block appears).
 *
 * The arithmetic is not this component's: the bands come from the single
 * derivation the aggregate of US-15c will fold (ADR-0017). What is decided here
 * is only how they are **printed**, and the one liberty taken — carrying the
 * rounding residual on the heaviest band — exists so the column the Player adds
 * up lands on the total the recap already showed them.
 *
 * **A `Phase` the Game never reached is said in words**, never rendered `0`.
 * Nineteen of the seventy-eight analysed Games have no Endgame: « 0,0 % en
 * finale » there would be read as a strength, and the Player has no way to tell
 * a clean Endgame from an Endgame that never happened. It is the same rule as
 * the `Key moment` with no score, which refuses to print a zero.
 *
 * Nothing is carried by colour (ADR-0013): every band, every absence and every
 * column is a word or a figure.
 */
export function PhaseDamageReadout({
  recap,
  showOpportunities = false,
}: {
  recap: GameRecap;
  /**
   * Whether the opponent's column is shown (ADR-0034). **Off by default**, the
   * same opt-in the recap and the move list ride: a caller that has not asked
   * for the opponent gets a table about the Player and nobody else.
   */
  showOpportunities?: boolean;
}) {
  const bands = new Map(printedBands(recap).map((printed) => [printed.phase, printed]));

  return (
    <section aria-labelledby="phase-damage-heading" className="card" data-part="phase-damage">
      <h3 id="phase-damage-heading">Où cette partie s'est jouée</h3>
      <table>
        <caption>
          Vos chances perdues réparties par phase. Les trois lignes se rajoutent au total du
          récapitulatif ci-dessus.
        </caption>
        <thead>
          <tr>
            <th scope="col">Phase</th>
            <th scope="col">Chances perdues</th>
            <th scope="col">Lâchées d'un coup</th>
            <th scope="col">Saignées</th>
            <th scope="col">Erreurs comptées</th>
            {/*
              The opponent's column is named after the opponent, in words, before
              any figure — the reader is told whose Moves are counted before
              being handed a number (ADR-0034).
            */}
            {showOpportunities && <th scope="col">{OPPORTUNITY_OFFERED_PHRASE}</th>}
          </tr>
        </thead>
        <tbody>
          {PHASES.map((phase) => {
            const damage = recap.byPhase[phase];
            const printed = bands.get(phase);
            return (
              <tr key={phase} data-phase={phase}>
                <th scope="row">{PHASE_LABEL[phase]}</th>
                {damage === null || printed === undefined ? (
                  /*
                    Said once, across the row, and in words. A row of zeroes here
                    would be a lie the Player cannot detect; five cells each
                    saying "non atteinte" would be noise. `colSpan` is computed
                    from the columns actually drawn, so the opt-in above cannot
                    leave the row short.
                  */
                  <td colSpan={showOpportunities ? 5 : 4} data-part="not-reached">
                    Phase non atteinte par cette partie.
                  </td>
                ) : (
                  <>
                    <td>{points(printed.chancesLost)}</td>
                    <td>{points(printed.flaggedLoss)}</td>
                    <td>{points(printed.drift)}</td>
                    <td>{damage.countedErrors}</td>
                    {showOpportunities && (
                      <td data-part="phase-opportunities">
                        {damage.opportunities.total} {OPPORTUNITY_TERM}
                      </td>
                    )}
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
