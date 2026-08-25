import { biasOf } from "./bias";
import { DECLARED_SEVERITY_LABEL } from "../personal/declaredSeverity";
import { DECLARED_SEVERITIES, MEASURED_LABELS } from "../../types";
import type { ConfusionMatrix, MeasuredLabel } from "../../types";

/** The four measured columns, in the Player's own terms. */
const MEASURED_LABEL: Record<MeasuredLabel, string> = {
  blunder: "Bévue",
  mistake: "Erreur",
  inaccuracy: "Imprécision",
  // A fact, not an absence — and the column that makes `Sound` scorable at all.
  none: "Rien de flagué",
};

/**
 * **How** the Player gets it wrong, and not merely how often (CONTEXT.md).
 *
 * Rows are what the Player declared, columns what was measured; the diagonal is
 * agreement. Every cell carries its **count**, never an intensity alone: a matrix
 * is exactly the kind of table where a colour ramp quietly replaces the
 * information, and this one has to be addable by eye — the scorable cells sum to
 * the accuracy denominator printed beside it, and the Player must be able to
 * check that.
 *
 * The `good` row is present and **never scored**: the engine flags flawed Moves
 * only and has no band for merit, so a `Good` has nothing on the other side.
 * Shown, because the Player needs it to read their Game; outside the sum, because
 * it can be neither right nor wrong.
 *
 * A cell off the diagonal is a **divergence** — where to look — never an error.
 */
export function ConfusionMatrixTable({ matrix }: { matrix: ConfusionMatrix }) {
  const bias = biasOf(matrix);

  return (
    <div data-part="matrix">
      {/* Its own scroll box: four columns plus a row header outgrow a narrow
          window, and the page body must never scroll sideways. */}
      <div data-part="matrix-scroll">
        <table aria-label="Mes verdicts face à ceux du moteur">
          <thead>
            <tr>
              <th scope="col">Mon verdict \ le moteur</th>
              {MEASURED_LABELS.map((label) => (
                <th key={label} scope="col">
                  {MEASURED_LABEL[label]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DECLARED_SEVERITIES.map((declared) => (
              <tr key={declared} data-scored={declared !== "good"}>
                <th scope="row">
                  {DECLARED_SEVERITY_LABEL[declared]}
                  {declared === "good" && <span data-part="unscored"> (jamais noté)</span>}
                </th>
                {MEASURED_LABELS.map((label) => {
                  // `Sound` and "nothing flagged" both say *nothing wrong here*,
                  // which is why they meet on the diagonal.
                  const agreement =
                    declared !== "good" &&
                    (declared === label || (declared === "sound" && label === "none"));
                  const count = matrix[declared][label];
                  return (
                    <td
                      key={label}
                      data-cell
                      data-agreement={agreement}
                      // Said in words, so the diagonal survives a screen reader
                      // and a monochrome eye alike.
                      aria-label={`${DECLARED_SEVERITY_LABEL[declared]} contre ${MEASURED_LABEL[label]} : ${count} ${agreement ? "— accord" : ""}`}
                    >
                      <span data-count>{count}</span>
                      {/* The diagonal, marked by a GLYPH and not by a tint: a
                          colour ramp on a matrix quietly replaces the very
                          information the table exists to carry. */}
                      {agreement && count > 0 && <span data-part="agreement-mark"> ✓</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BiasSentence bias={bias} />
    </div>
  );
}

/**
 * **The direction of the bias** — the one further fact worth folding, free
 * because the matrix already holds it. Over-reading danger and under-reading it
 * are opposite faults of analysis, and none of the three figures separates them
 * alone.
 *
 * The counts travel with the sentence so the Player can find them in the cells
 * above: a claim about their play that they cannot check is worth nothing here.
 *
 * **And when the cells do not support a claim, none is made** — said outright
 * rather than left as a blank, so an absent sentence reads as "nothing to
 * conclude" and not as a screen that failed to render.
 */
function BiasSentence({ bias }: { bias: ReturnType<typeof biasOf> }) {
  if (bias.direction === null) {
    return (
      <p data-part="bias">
        Pas assez de divergences pour dire dans quel sens vous penchez.
      </p>
    );
  }

  const over = bias.direction === "over";
  return (
    <p data-part="bias">
      Vous <strong>{over ? "sur-évaluez" : "sous-évaluez"} le danger</strong> :{" "}
      {over ? bias.over : bias.under} de vos verdicts sont{" "}
      {over ? "plus sévères" : "moins sévères"} que la mesure, contre{" "}
      {over ? bias.under : bias.over} dans l'autre sens.
    </p>
  );
}
