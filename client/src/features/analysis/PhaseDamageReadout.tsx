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
 * A column of figures, printed to the tenth so that it **lands exactly on the
 * total stated above it** — the one sum this block invites the Player to make.
 *
 * Rounding each line on its own misses that total by a tenth, so a residual has
 * to go somewhere. It is settled by the **largest remainder**: every line is
 * taken down to its tenth, and the tenths still owed to the total go to the
 * lines that were closest to rounding up, one each.
 *
 * That rule replaced « the heaviest line carries the whole residual », which was
 * only safe while the lines were **three**. The `Material signature` list is
 * unbounded: five configurations at 0,06 each print 0,1 and overshoot a 0,3
 * total by two tenths, and one line handed the whole of that prints « −0,1 % ».
 * Largest remainder never does: no line is printed below its own floor, so a
 * line at zero stays at zero and nothing goes negative — which is the reading
 * this block exists to guarantee, on the case it exists for.
 *
 * Non-negative in, non-negative out. Chances lost are.
 */
function carryResidual(values: number[], total: number): number[] {
  const TENTH = 0.1;
  // A hair of tolerance, because 3.3 / 0.1 is 32.99999999999999 in binary.
  const floors = values.map((value) => Math.floor(value / TENTH + 1e-9));
  const remainders = values.map((value, i) => value / TENTH - floors[i]);
  let owed = Math.round(total / TENTH) - floors.reduce((sum, tenths) => sum + tenths, 0);

  const order = values
    .map((_, i) => i)
    .sort((a, b) => remainders[b] - remainders[a] || values[b] - values[a] || a - b);
  // Owed tenths go up that order; a debt — a total below what the floors already
  // hold — comes off the fullest lines first, and never takes one below zero.
  for (const i of owed >= 0 ? order : [...order].reverse()) {
    if (owed === 0) break;
    if (owed > 0) {
      floors[i] += 1;
      owed -= 1;
    } else if (floors[i] > 0) {
      floors[i] -= 1;
      owed += 1;
    }
  }
  return floors.map((tenths) => round(tenths * TENTH));
}

/**
 * The reached bands, printed so that their `chancesLost` sum to the Game's own
 * rounded total and their `flaggedLoss` to its rounded flagged loss. `drift` is
 * then the **difference of the two printed figures**, never a third rounding, so
 * the identity holds line by line as well as column by column.
 *
 * **Each column is settled on its own**, and that is not a refinement: a Phase
 * that only bled has a `flaggedLoss` of zero, and a residual pushed onto it would
 * print « −0,1 % » under *lâchées* and a `drift` larger than the loss — breaking
 * the reading the split was built for.
 */
export function printedBands(recap: GameRecap): PrintedBand[] {
  const reached = PHASES.filter((phase) => recap.byPhase[phase] !== null);
  const band = (phase: Phase) => recap.byPhase[phase] as PhaseDamage;

  const lost = carryResidual(
    reached.map((phase) => band(phase).chancesLost),
    recap.chancesLost,
  );
  const flagged = carryResidual(
    reached.map((phase) => band(phase).flaggedLoss),
    recap.flaggedLoss,
  );

  return reached.map((phase, i) => ({
    phase,
    chancesLost: lost[i],
    flaggedLoss: flagged[i],
    drift: round(lost[i] - flagged[i]),
  }));
}

/**
 * The crossed configurations, printed so their column lands on the **printed**
 * Endgame figure of the table just above — which is the sum the Player is
 * invited to make, the two tables being one block.
 *
 * Settled by the same function as the bands, which is the point: one doctrine
 * stated once cannot diverge from itself. The list here is **unbounded**, and
 * that is exactly why the rule had to stop being « the heaviest line takes it
 * all » (see `carryResidual`).
 *
 * The **crossing order is kept**: the sequence is the reading — an imbalance is
 * born mid-Game (ADR-0036) — and sorting it by damage would turn a story into a
 * ranking.
 */
export function printedSignatures(
  crossed: SignatureDamage[],
  endgameTotal: number,
): SignatureDamage[] {
  const printed = carryResidual(
    crossed.map((line) => line.chancesLost),
    endgameTotal,
  );
  return crossed.map((line, i) => ({ ...line, chancesLost: printed[i] }));
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
      {/* The Endgame as the table above PRINTS it, handed over rather than
          recomputed — two calls to `printedBands` could not disagree today, and
          that is not a reason to let them. */}
      <MaterialSignatureTable
        crossed={recap.bySignature}
        endgameTotal={bands.get("endgame")?.chancesLost ?? 0}
      />
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
function MaterialSignatureTable({
  crossed,
  endgameTotal,
}: {
  crossed: SignatureDamage[] | null;
  /** The Endgame's chances lost **as the table above printed them**. */
  endgameTotal: number;
}) {
  if (crossed === null) {
    return (
      <p data-part="no-signature">
        Cette partie n'a pas atteint la finale : aucune configuration de pièces à lister.
      </p>
    );
  }

  const printed = printedSignatures(crossed, endgameTotal);

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
        {printed.map((line) => (
          <tr key={line.signature} data-signature={line.signature}>
            <th scope="row">{line.signature}</th>
            <td>{points(line.chancesLost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
