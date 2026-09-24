import type { ReactNode } from "react";
import { OPPORTUNITY_OFFERED_PHRASE, OPPORTUNITY_TERM } from "../../chess/opportunity";
import { PHASES, PHASE_LABEL, type Phase } from "../../chess/phase";
import { points, roundToTenth as round } from "../../chess/points";
import type { GameRecap, PhaseDamage, SignatureDamage } from "../../types";

/**
 * What the table prints for one `Phase`, in figures that **add up on screen**.
 *
 * Rounding each band on its own would leave the column off the recap's total by
 * a tenth, and adding the column back to that total is exactly what this table
 * invites the Player to do. So the bands are rounded, and the **residual of the
 * rounding** is carried by the heaviest band of **that column** — the one where
 * a tenth is least of its own value. It is the same reasoning the recap already
 * applies to its `Drift`: the model is exact, and what must not fail to check is
 * the arithmetic the Player can see.
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
 * then the **difference of the two printed figures**, never a third rounding, so
 * the identity holds line by line as well as column by column.
 *
 * **Each column carries its residual on its own heaviest band**, and that is not
 * a refinement: a Phase that only bled has a `flaggedLoss` of zero, and handing
 * it a negative residual would print « −0,1 % » under *lâchées* and a `drift`
 * larger than the loss — breaking the one reading this block exists to
 * guarantee, on precisely the case the split was built for.
 */
export function printedBands(recap: GameRecap): PrintedBand[] {
  const reached = PHASES.filter((phase) => recap.byPhase[phase] !== null);
  const band = (phase: Phase) => recap.byPhase[phase] as PhaseDamage;

  const settle = (read: (damage: PhaseDamage) => number, total: number) => {
    const printed = new Map(reached.map((phase) => [phase, round(read(band(phase)))]));
    const drawn = [...printed.values()].reduce((sum, value) => sum + value, 0);
    // This column's own heaviest band — on a column that is all zeroes it is the
    // first, where the residual is zero too.
    const carrier = reached.reduce(
      (worst, phase) => (read(band(phase)) > read(band(worst)) ? phase : worst),
      reached[0],
    );
    printed.set(carrier, round((printed.get(carrier) ?? 0) + (round(total) - drawn)));
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
 * The crossed configurations, printed so their column lands on the **printed**
 * Endgame figure of the table just above — which is the sum the Player is
 * invited to make, the two tables being one block.
 *
 * Same doctrine as `printedBands`, one scale down and with a single column: the
 * residual of the rounding is carried by the **heaviest** line, where a tenth is
 * least of its own value. Handing it to a configuration crossed cleanly would
 * print « −0,1 % » under a line whose whole meaning is *this one cost nothing* —
 * the bug slice 02's review caught, on the case the list exists to show.
 *
 * The **crossing order is kept**: the sequence is the reading — an imbalance is
 * born mid-Game (ADR-0036) — and sorting it by damage would turn a story into a
 * ranking.
 */
export function printedSignatures(
  crossed: SignatureDamage[],
  endgameTotal: number,
): SignatureDamage[] {
  const printed = crossed.map((line) => ({ ...line, chancesLost: round(line.chancesLost) }));
  if (printed.length === 0) return printed;
  const drawn = printed.reduce((sum, line) => sum + line.chancesLost, 0);
  const carrier = printed.reduce(
    (worst, line) => (line.chancesLost > worst.chancesLost ? line : worst),
    printed[0],
  );
  carrier.chancesLost = round(carrier.chancesLost + (round(endgameTotal) - drawn));
  return printed;
}

/** One column of the table: its header and what it prints for a reached Phase.
 *  The columns are **data**, so the row that spans them all — « non atteinte » —
 *  counts them instead of being told a number that a sixth column would break. */
interface Column {
  head: string;
  cell: (damage: PhaseDamage, printed: PrintedBand) => ReactNode;
}

/**
 * **Where** the Game was lost (US-32) — the recap's own figures, located by
 * `Phase`, read directly under the recap and therefore under the controls
 * (ADR-0021: nothing the Player acts on moves when this block appears).
 *
 * The arithmetic is not this component's: the bands come from the single
 * derivation the aggregate of US-15c will fold (ADR-0017). What is decided here
 * is only how they are **printed**, and the one liberty taken — carrying the
 * rounding residual on each column's heaviest band — exists so the column the
 * Player adds up lands on the total the recap already showed them.
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

  const columns: Column[] = [
    { head: "Chances perdues", cell: (_, printed) => points(printed.chancesLost) },
    { head: "Lâchées d'un coup", cell: (_, printed) => points(printed.flaggedLoss) },
    { head: "Saignées", cell: (_, printed) => points(printed.drift) },
    { head: "Erreurs comptées", cell: (damage) => damage.countedErrors },
  ];
  if (showOpportunities) {
    // Named after the opponent, in words, before any figure — the reader is told
    // whose Moves are counted before being handed a number (ADR-0034).
    columns.push({
      head: OPPORTUNITY_OFFERED_PHRASE,
      cell: (damage) => `${damage.opportunities.total} ${OPPORTUNITY_TERM}`,
    });
  }

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
            {columns.map((column) => (
              <th key={column.head} scope="col">
                {column.head}
              </th>
            ))}
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
                    would be a lie the Player cannot detect; one cell per column
                    each saying "non atteinte" would be noise.
                  */
                  <td colSpan={columns.length} data-part="not-reached">
                    Phase non atteinte par cette partie.
                  </td>
                ) : (
                  columns.map((column) => <td key={column.head}>{column.cell(damage, printed)}</td>)
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      <MaterialSignatureTable recap={recap} />
    </section>
  );
}

/**
 * **In which configuration** (US-32): the `Material signature`s the Endgame
 * crossed, each with what it cost. Second table of the **same** block (spec §5)
 * rather than a section of its own — the two are one question asked at two
 * scales, and US-33 already has enough stacked under the board.
 *
 * A configuration is a **name**, never a balance: `RR vs Q` is +1 on any points
 * scale and an entirely different Game to play (ADR-0036). Nothing here converts
 * it back into a number.
 *
 * **A Game that never reached the Endgame is told so in a sentence**, not shown
 * an empty table: the axis is mute on 27 % of the corpus, and an empty table
 * reads as a failure to load rather than as an absence.
 */
function MaterialSignatureTable({ recap }: { recap: GameRecap }) {
  if (recap.bySignature === null) {
    return (
      <p data-part="no-signature">
        Cette partie n'a pas atteint la finale : aucune configuration de pièces à lister.
      </p>
    );
  }

  // The Endgame as the table above PRINTS it, not as the payload holds it — the
  // sum the Player makes is between two figures on the same screen.
  const endgame = printedBands(recap).find((printed) => printed.phase === "endgame");
  const crossed = printedSignatures(recap.bySignature, endgame?.chancesLost ?? 0);

  return (
    <table data-part="material-signature">
      <caption>
        Les configurations de pièces traversées en finale, dans l'ordre, et ce que chacune vous a
        coûté. Elles se rajoutent à la ligne « {PHASE_LABEL.endgame} » ci-dessus.
      </caption>
      <thead>
        <tr>
          <th scope="col">Configuration</th>
          <th scope="col">Chances perdues</th>
        </tr>
      </thead>
      <tbody>
        {crossed.map((line) => (
          <tr key={line.signature} data-signature={line.signature}>
            <th scope="row">{line.signature}</th>
            <td>{points(line.chancesLost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
