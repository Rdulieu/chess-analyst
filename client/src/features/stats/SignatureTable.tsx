import { Tally } from "../../components/Tally";
import type { SignatureTable as Table } from "../../types";
import { games, percent, plural, signed } from "./counts";

const configurations = (n: number) => `${n} ${n > 1 ? "configurations" : "configuration"}`;

/**
 * The Endgame configurations the Player frequents, and how they fare there
 * (US-32, ADR-0036).
 *
 * **Three things this block refuses to do**, each of them an instruction:
 *
 * - **No bare rate.** Every line carries its counts *and* its rate, side by
 *   side. At the threshold — three Games — a rate is worth ±29 points, and the
 *   visible denominator is the guard-rail, not the threshold.
 * - **No erasure.** What falls under the bar is counted on one line, so the
 *   Player knows what the table is not showing them.
 * - **No false whole.** The table says how many Games it covers and how many
 *   never reach an Endgame at all, because a Game sits on as many rows as it
 *   crossed configurations and the column therefore adds up to nothing.
 *
 * Order comes from the server, **most played first**; re-sorting here would be a
 * second opinion on the same question. Nothing is carried by colour alone
 * (ADR-0013) — every figure is written.
 */
export function SignatureTable({ table }: { table: Table }) {
  const { scope, rows, below, threshold } = table;
  const share = scope.games === 0 ? 0 : Math.round((scope.withoutEndgame / scope.games) * 100);

  return (
    <section aria-labelledby="signatures-heading">
      <h3 id="signatures-heading">Configurations de finale</h3>

      <p data-testid="signature-scope">
        {scope.withEndgame === 0
          ? `Aucune de vos ${games(scope.games)} n'atteint la finale — rien à montrer ici.`
          : `Sur vos ${games(scope.games)}, ${scope.withEndgame} atteignent la finale ; ` +
            `${scope.withoutEndgame} (${share} %) n'y arrivent jamais.`}
        {/* Said, never folded into « n'y arrivent jamais » : a PGN we failed to
            replay is our failure, and reporting it as the Player's chess is the
            one thing this block is built not to do. */}
        {scope.unreadable === 0
          ? null
          : ` ${scope.unreadable} partie${plural(scope.unreadable)} n'a pas pu être relue et ` +
            `ne compte dans aucune ligne.`}
      </p>

      {rows.length === 0 ? null : (
        <div data-scroll="x">
          <table aria-label="configurations de finale">
            <thead>
              <tr>
                <th scope="col">Configuration</th>
                <th scope="col">± matériel</th>
                <th scope="col">Parties</th>
                <th scope="col">Résultats</th>
                <th scope="col">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.signature}>
                  <th scope="row">{row.signature}</th>
                  {/* A column, never the key and never the order (ADR-0036):
                      `RR vs Q` reads « +1 » here, which is the ADR's own
                      argument shown rather than corrected. The band table below
                      says what a band does NOT determine. */}
                  <td>{signed(row.delta)}</td>
                  <td>{games(row.games)}</td>
                  <td>
                    <Tally win={row.win} draw={row.draw} loss={row.loss} />
                  </td>
                  {/* Never null here: a row exists only from three Games, and
                      `winRate` is null only on an empty bucket. */}
                  <td>{percent(row.winRate ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 ? null : (
        <p data-testid="signature-scale">
          Le <strong>± matériel</strong> est le solde en points des majeures et mineures : les
          vôtres moins celles de l'adversaire. Barème dame&nbsp;9, tour&nbsp;5, fou&nbsp;3,
          cavalier&nbsp;3 ; rois et pions n'y sont pas. Il situe une configuration, il ne
          l'identifie pas et ne trie rien : <strong>RR vs Q</strong> y vaut +1 alors que deux tours
          contre une dame est une autre partie d'échecs.
        </p>
      )}

      {below.configurations === 0 ? null : (
        <p data-testid="signature-below">
          {configurations(below.configurations)} vues moins de {games(threshold)} ne sont pas
          affichées.
        </p>
      )}
    </section>
  );
}
