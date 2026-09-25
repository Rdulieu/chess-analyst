import { PHASE_LABEL } from "../../chess/phase";
import { Tally } from "../../components/Tally";
import type { PhaseResultTable as Table } from "../../types";

const percent = (rate: number) => `${Math.round(rate * 100)} %`;
const games = (n: number) => `${n} ${n > 1 ? "parties" : "partie"}`;
const plural = (n: number) => (n > 1 ? "s" : "");

/**
 * **Où vos parties se décident** (US-32): one row per `Phase`, the Phase each
 * Game *ended* in, in results.
 *
 * Three things this block insists on, each of them an instruction:
 *
 * - **The shares make 100 %, and it says so.** A Game ends in one Phase and one
 *   only. That is the exact opposite of the configuration table it sits beside,
 *   whose column adds up to nothing — two neighbouring tables whose columns mean
 *   opposite things must each say which, or the reader will assume they match.
 * - **Never a bare rate.** Counts and rate together, as everywhere else.
 * - **A correlation, said to be one.** A Game that *ended* in the Endgame was
 *   not lost *by* the Endgame — it is a Game nothing decided earlier. The
 *   mitigation is written under the table, not implied by its silence.
 *
 * It covers the **whole** history and costs no engine time; the damage table
 * below covers the analysed Games only, and the gap is written there.
 *
 * Nothing is carried by colour (ADR-0013), and the table scrolls inside its own
 * `[data-scroll="x"]` with the prose outside it, so a narrow window moves the
 * figures and never the sentences.
 */
export function PhaseResultTable({ table }: { table: Table }) {
  const { rows, games: total, filed, unreadable } = table;

  if (total === 0) return null;

  return (
    <section aria-labelledby="phase-results-heading">
      <h3 id="phase-results-heading">Où vos parties se décident</h3>

      <p data-testid="phase-results-scope">
        La phase dans laquelle chacune de vos {games(total)} s'est terminée. Une partie se termine
        dans une phase et une seule : <strong>les parts font 100 %</strong> — au contraire du
        tableau ci-dessus, où une partie compte dans autant de lignes qu'elle a croisé de
        configurations.
        {/* Our failure, never told as the Player's chess — the same refusal the
            configuration table makes, on the same replay. */}
        {unreadable === 0
          ? null
          : ` ${unreadable} partie${plural(unreadable)} n'a pas pu être relue et ne compte dans` +
            ` aucune ligne : ${games(filed)} sont réparties ci-dessous.`}
      </p>

      <div data-scroll="x">
        <table aria-label="parties par phase de fin">
          <thead>
            <tr>
              <th scope="col">Phase de fin</th>
              <th scope="col">Parties</th>
              <th scope="col">Part</th>
              <th scope="col">Résultats</th>
              <th scope="col">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.phase}>
                <th scope="row">{PHASE_LABEL[row.phase]}</th>
                <td>{games(row.games)}</td>
                <td>{row.share} %</td>
                <td>
                  <Tally win={row.win} draw={row.draw} loss={row.loss} />
                </td>
                {/* Empty rather than « 0 % » on a Phase no Game ended in: a rate
                    over no Game is not zero, it is unsaid. */}
                <td>{row.winRate === null ? null : percent(row.winRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p data-testid="phase-results-caveat">
        Ce tableau montre une corrélation, pas une cause : une partie terminée en finale n'a pas
        été <em>perdue par</em> la finale — c'est une partie que rien n'avait décidée avant.
      </p>
    </section>
  );
}
