import { Tally } from "../../components/Tally";
import type { MaterialBandTable as Table } from "../../types";
import { percent, plural } from "./counts";

/**
 * **Le win rate par bande de matériel** (US-32, demandé le 2026-09-25): the
 * comparison the requester asked for — the material disagreement set against
 * the win rate — and the reading that makes the `± matériel` column above
 * usable.
 *
 * Three things this block insists on, each of them an instruction:
 *
 * - **Its unit is the couple (Game, configuration), and it says so.** A Game
 *   crosses several configurations and therefore lands in several bands: the
 *   column adds up to no history, exactly like the configuration table it sits
 *   under, and for the same reason.
 * - **The bands are a choice, printed rather than hidden.** Nothing measured
 *   picks them; what is measured is what they show.
 * - **The mitigation is written, and it is the point of the block** (ADR-0036).
 *   Seven monotone rates read as a law unless the screen says what a band does
 *   *not* determine: inside material equality the configurations spread from
 *   0 % to 83 % on the requester's base. The band situates; it does not
 *   predict. Left out, this table would contradict the very ADR whose argument
 *   the column above illustrates.
 *
 * Nothing is carried by colour (ADR-0013): a `+` and a `−` are text. The table
 * scrolls inside its own `[data-scroll="x"]` with the prose outside it.
 */
export function MaterialBandTable({ table }: { table: Table }) {
  const { rows, couples, threshold, equalBand } = table;

  if (couples === 0) return null;

  const equal = rows.find((row) => row.band === equalBand);
  const spread = equal?.spread ?? null;

  return (
    <section aria-labelledby="material-bands-heading">
      <h3 id="material-bands-heading">Déséquilibre matériel et win rate</h3>

      <p data-testid="material-bands-scope">
        Les mêmes configurations de finale, rangées par bande de ± matériel. Le dénominateur{" "}
        <strong>n'est pas un nombre de parties</strong> : l'unité est le couple (partie,
        configuration), et une partie qui traverse plusieurs configurations compte dans plusieurs
        bandes. {couples} couples au total.
      </p>

      <div data-scroll="x">
        <table aria-label="win rate par bande de matériel">
          <thead>
            <tr>
              <th scope="col">Bande</th>
              <th scope="col">Couples</th>
              <th scope="col">Résultats</th>
              <th scope="col">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.band}>
                <th scope="row">{row.band}</th>
                <td>{row.games}</td>
                <td>
                  <Tally win={row.win} draw={row.draw} loss={row.loss} />
                </td>
                {/* Empty rather than « 0 % » on a band no couple fell into: a
                    rate over nothing is unsaid, not zero. */}
                <td>{row.winRate === null ? null : percent(row.winRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {spread === null ? null : (
        <p data-testid="material-bands-spread">
          <strong>Une bande situe, elle ne prédit pas.</strong> À matériel égal ({equalBand}), les{" "}
          {spread.configurations} configuration{plural(spread.configurations)} vues au moins{" "}
          {threshold} fois vont de {percent(spread.lowest)} à {percent(spread.highest)} de win rate.
          Le chiffre de la ligne est la moyenne de cet écart-là, pas une loi : deux tours contre une
          dame et un fou contre un cavalier pèsent tous les deux « à peu près zéro » et ne se jouent
          pas de la même façon.
        </p>
      )}
    </section>
  );
}
