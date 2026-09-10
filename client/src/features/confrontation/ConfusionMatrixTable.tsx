import { useState } from "react";
import { biasOf } from "./bias";
import { moveName } from "./moveName";
import { DECLARED_SEVERITY_LABEL } from "../personal/declaredSeverity";
import { DECLARED_SEVERITIES, MEASURED_LABELS } from "../../types";
import type { ConfusionMatrix, MeasuredLabel, MoveReading } from "../../types";

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
export function ConfusionMatrixTable({
  matrix,
  moves = [],
  onFocusMove,
}: {
  matrix: ConfusionMatrix;
  /**
   * The per-Move readings the cells are made of (ADR-0032). **This is the
   * proof**, not a convenience: the Moves a cell unfolds *are* what filled it,
   * because both come from the same list. A cell that had to go and look its
   * Moves up somewhere else would be a second derivation, and the day the two
   * disagreed the Player would have no way to tell which was lying.
   */
  moves?: MoveReading[];
  /** Bring the board to one Move. Absent where there is no board to move. */
  onFocusMove?: (ply: number) => void;
}) {
  const bias = biasOf(matrix);
  /**
   * Which cell is unfolded, or `null`. **One at a time, and closed by
   * default**: the enumeration this story spent slice 04 removing must not
   * come back as sixteen open lists, and a Player who wants one cell is not
   * asking for the other nineteen.
   */
  const [open, setOpen] = useState<string | null>(null);

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
                      aria-label={
                        `${DECLARED_SEVERITY_LABEL[declared]} contre ${MEASURED_LABEL[label]} : ${count}` +
                        (agreement ? " — accord" : "")
                      }
                    >
                      <CellContent
                        count={count}
                        agreement={agreement}
                        cellId={`${declared}-${label}`}
                        open={open === `${declared}-${label}`}
                        onToggle={setOpen}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BiasSentence bias={bias} />
      {/*
        The unfolded cell, **below the table**. Not inside the `<td>`: a list
        in a cell resizes its column, and the matrix's columns are what the
        Player adds up. Below it, the unfolding also cannot move anything above
        the matrix — which is ADR-0021 held by position, the matrix being the
        last block of the panel.
      */}
      {open && (
        <CellMoves
          cellId={open}
          moves={moves}
          matrix={matrix}
          onFocusMove={onFocusMove}
        />
      )}
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


/**
 * A cell's count, and — when it has Moves behind it — the control that unfolds
 * them.
 *
 * **An empty cell is not a button.** It has nothing to show, and a control that
 * opens onto nothing teaches the Player that the affordance lies.
 */
function CellContent({
  count,
  agreement,
  cellId,
  open,
  onToggle,
}: {
  count: number;
  agreement: boolean;
  cellId: string;
  open: boolean;
  onToggle: (next: string | null) => void;
}) {
  const mark = agreement && count > 0 && <span data-part="agreement-mark"> ✓</span>;

  if (count === 0) {
    return (
      <>
        <span data-count>{count}</span>
        {mark}
      </>
    );
  }

  return (
    <>
      {/* A real `<button>`, so it is reachable and operable by keyboard for
          free, and `aria-expanded` says which state it is in — a disclosure
          that does not announce itself is a disclosure only a mouse can find. */}
      <button type="button" aria-expanded={open} onClick={() => onToggle(open ? null : cellId)}>
        <span data-count>{count}</span>
      </button>
      {mark}
    </>
  );
}

/**
 * The Moves behind one cell — **the proof that the figure and the board are
 * one calculation** (ADR-0032).
 *
 * This is the exact gap the 25/08 feedback named: a Player reading "1 sur 4"
 * could not find the other three. They are here, each named by its notation
 * rather than merely numbered, and each a way back to the diagram.
 */
function CellMoves({
  cellId,
  moves,
  matrix,
  onFocusMove,
}: {
  cellId: string;
  moves: MoveReading[];
  matrix: ConfusionMatrix;
  onFocusMove?: (ply: number) => void;
}) {
  const [declared, measured] = cellId.split("-") as [
    keyof ConfusionMatrix,
    MeasuredLabel,
  ];
  const inCell = moves.filter(
    (move) => move.declared === declared && move.measured === measured && move.unscored === null,
  );
  const announced = matrix[declared][measured];

  return (
    <div data-part="cell-moves">
      <h4>
        {DECLARED_SEVERITY_LABEL[declared]} contre {MEASURED_LABEL[measured]} — {announced}
      </h4>
      {inCell.length === 0 ? (
        /* The count and the list come from the same per-Move readings, so this
           cannot happen while ADR-0032 holds. Said rather than rendered as an
           empty list, because an empty list under a count of four is the exact
           shape of a bug the Player should be told about. */
        <p>Les coups de cette cellule ne sont pas disponibles.</p>
      ) : (
        <ul>
          {inCell.map((move) => (
            <li key={move.ply}>
              <button type="button" onClick={() => onFocusMove?.(move.ply)}>
                {moveName(move.ply, move.notation)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
