import { PHASE_LABEL, PHASE_PHRASE } from "../../chess/phase";
import { points, roundToTenth } from "../../chess/points";
import type { PhaseDamageTable as Table, PhaseResultTable as Results } from "../../types";
import { games } from "./counts";
import { phaseDisagreement } from "./phaseReading";

const share = (value: number) => points(roundToTenth(value * 100));

/**
 * **Où tombent vos dégâts** (US-32, ADR-0036's amendment of 2026-09-25): the
 * same `Phase` axis as the results table above, the other currency, and
 * deliberately a **second table**.
 *
 * The amendment restricts "the corpus speaks in results" rather than repealing
 * it: what made a corpus-wide damage reading hollow was the **cardinality**, not
 * the scale. The Games that scatter over 808 `Material signature`s fall into
 * three Phases — twenty-two Games a bucket on the requester's base.
 *
 * Its three conditions are this block's three refusals:
 *
 * 1. **Two tables, never one.** No composite, no shared column, no common
 *    ranking. The two readings do not name the same Phase, and the line that
 *    says so names it as an observation and stops there.
 * 2. **Its own denominator, written.** The analysed Games only, set beside the
 *    whole history in the same sentence — two denominators on one screen are a
 *    confusion unless they are spelled out.
 * 3. **No pooled sum.** Adding the whole corpus's chances lost lets the disaster
 *    Games decide, so the robust figure is a **count of Games**, and the mean
 *    **never travels without its median**: on the base the Endgame means 22,8 %
 *    and medians 11,9 %, and that gap *is* the dissymmetry.
 *
 * And it ages backwards — every engine pass improves it and moves its
 * denominator under the reader — so it announces a count, never "vos parties".
 */
export function PhaseDamageTable({ table, results }: { table: Table; results?: Results }) {
  const { rows, analysed, games: total, undamaged } = table;
  // The results table comes from the OTHER request since US-32 slice 08, and it
  // is the slower of the two. So the observation below waits for it while the
  // table itself does not: half a sentence would be worse than a sentence that
  // arrives a few seconds later, and holding the whole table hostage to it
  // would give back the wait the slice was cut to remove.
  const disagreement = results ? phaseDisagreement(results, table) : null;

  // A sentence, never a table of zeroes: nothing analysed is nothing to read,
  // and three rows of « — » would look like an answer.
  if (analysed === 0) {
    return (
      <section aria-labelledby="phase-damage-heading">
        <h3 id="phase-damage-heading">Où tombent vos dégâts</h3>
        <p data-testid="phase-damage-scope">
          Aucune de vos {games(total)} n'a été analysée : ce tableau n'a rien à lire. Lancez une
          passe d'analyse pour qu'il ait un dénominateur.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="phase-damage-heading">
      <h3 id="phase-damage-heading">Où tombent vos dégâts</h3>

      <p data-testid="phase-damage-scope">
        <strong>
          {analysed} de vos {games(total)} {analysed > 1 ? "ont été analysées" : "a été analysée"}
        </strong>{" "}
        — ce tableau ne porte que sur celles-là, là où celui du dessus porte sur toutes. Il annonce
        un compte, pas « vos parties » : chaque passe d'analyse déplace ce dénominateur.
        {undamaged === 0
          ? null
          : undamaged > 1
            ? ` ${undamaged} d'entre elles n'ont rien lâché du tout et ne désignent aucune phase.`
            : ` L'une d'entre elles n'a rien lâché du tout et ne désigne aucune phase.`}
      </p>

      <div data-scroll="x">
        <table aria-label="dégâts par phase">
          <thead>
            <tr>
              <th scope="col">Phase</th>
              <th scope="col">Phase dominante dans</th>
              <th scope="col">Parties l'ayant atteinte</th>
              <th scope="col">Part moyenne des dégâts</th>
              <th scope="col">Médiane</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.phase}>
                <th scope="row">{PHASE_LABEL[row.phase]}</th>
                <td>
                  {/* `analysed` is never zero here — the block above returns a
                      sentence in that case, and a guard on it would be a branch
                      no reader can reach. */}
                  {row.dominant} ({Math.round((row.dominant / analysed) * 100)} %)
                </td>
                <td>{games(row.reached)}</td>
                {/* « Non atteinte » rather than 0 %: a Game that never had an
                    Endgame is not a Game that crossed one cleanly, and printing
                    the second as the first is a false strength. */}
                <td>{row.meanShare === null ? "non atteinte" : share(row.meanShare)}</td>
                <td>{row.medianShare === null ? "non atteinte" : share(row.medianShare)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p data-testid="phase-damage-caveat">
        Deux limites, et elles ne s'annulent pas. L'échantillon est celui de vos parties{" "}
        <strong>analysées</strong>, pas de votre pratique. Et une partie qui n'atteint pas une
        phase ne compte pas dans le dénominateur de cette phase — c'est pourquoi la colonne
        « parties l'ayant atteinte » est donnée ligne par ligne. La moyenne ne va jamais sans sa
        médiane : quand les deux s'écartent, ce sont quelques parties catastrophe qui tirent la
        moyenne.
      </p>

      {disagreement === null ? null : (
        <p data-testid="phase-disagreement">
          Observation : vos <strong>dégâts</strong> désignent le plus souvent{" "}
          {PHASE_PHRASE[disagreement.damage]}, alors que vos <strong>résultats</strong> désignent{" "}
          {PHASE_PHRASE[disagreement.result]}, la phase où vous gagnez le moins. Les deux tableaux
          le constatent ; ni l'un ni l'autre ne dit pourquoi.
        </p>
      )}
    </section>
  );
}
