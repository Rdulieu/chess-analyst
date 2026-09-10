import { useEffect, useState } from "react";
import { biasOf } from "./bias";
import { moveName } from "./moveName";
import { DECLARED_SEVERITY_LABEL } from "../personal/declaredSeverity";
import { DECLARED_SEVERITIES, MEASURED_LABELS } from "../../types";
import type {
  ConfusionMatrix,
  DeclaredSeverity,
  MeasuredLabel,
  MoveReading,
} from "../../types";

/**
 * **Which Moves a matrix cell is made of** — the server's own rule, restated
 * once and used everywhere.
 *
 * The server fills the matrix for **every examined Move**, and `Good` is
 * examined: it increments `matrix[declared][measured]` *before* deciding the
 * verdict is unscorable. So a `Good` fills its cell and carries
 * `unscored: "good"` — and a predicate that simply excluded everything
 * unscored dropped the whole `good` row, which the table deliberately renders.
 *
 * The two derivations then agreed only where that row was empty. They agree by
 * **construction** now: scored, or unscored *for the one reason that still
 * counts as having looked*.
 */
function fillsMatrix(move: MoveReading): boolean {
  return move.declared !== null && (move.term !== null || move.unscored === "good");
}

/** One cell of the matrix, as a pair rather than a string to be split apart. */
interface Cell {
  declared: DeclaredSeverity;
  measured: MeasuredLabel;
}

/** Whether two cells are the same one. */
function sameCell(a: Cell | null, b: Cell): boolean {
  return a !== null && a.declared === b.declared && a.measured === b.measured;
}

/** The panel every cell's control points at — one open at a time, so one id. */
const CELL_PANEL_ID = "confrontation-cell-moves";

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
  const [open, setOpen] = useState<Cell | null>(null);
  /**
   * The disclosure exists only where there is a board to jump to. The corpus
   * screen renders this same table over a whole history, with no Game under
   * it — offering to unfold there would reintroduce the enumeration slice 04
   * removed, and, with no per-Move list to draw on, would unfold to nothing.
   */
  const unfoldable = onFocusMove !== undefined && moves.length > 0;
  /**
   * An unfolded cell belongs to the matrix it was opened on. After a change of
   * Game the same cell holds different Moves, and leaving it open would show
   * the new Game's Moves under the old Game's disclosure without anybody
   * having asked.
   */
  useEffect(() => setOpen(null), [matrix]);

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
                        cell={{ declared, measured: label }}
                        label={`${DECLARED_SEVERITY_LABEL[declared]} contre ${MEASURED_LABEL[label]}`}
                        unfoldable={unfoldable}
                        open={sameCell(open, { declared, measured: label })}
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
        <CellMoves cell={open} moves={moves} matrix={matrix} onFocusMove={onFocusMove} />
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
  cell,
  label,
  unfoldable,
  open,
  onToggle,
}: {
  count: number;
  agreement: boolean;
  cell: Cell;
  /** What the cell is, so the control's own name says it and not just "2". */
  label: string;
  unfoldable: boolean;
  open: boolean;
  onToggle: (next: Cell | null) => void;
}) {
  const mark = agreement && count > 0 && <span data-part="agreement-mark"> ✓</span>;

  if (count === 0 || !unfoldable) {
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
          that does not announce itself is a disclosure only a mouse can find.
          Named by its CELL: the count alone would have every control in the
          table announce itself as a bare number. */}
      <button
        type="button"
        data-part="cell-toggle"
        aria-expanded={open}
        aria-controls={CELL_PANEL_ID}
        aria-label={`${label} : ${count} — voir les coups`}
        onClick={() => onToggle(open ? null : cell)}
      >
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
 *
 * There is **no "unavailable" fallback**. There was one, and it was a mistake:
 * it turned two real defects into a sentence the Player was invited to
 * distrust. The count and the list now come from one predicate, so a cell that
 * announces four has four — and if that ever stops being true, the test that
 * checks every cell of the matrix goes red, which is where it should be said.
 */
function CellMoves({
  cell,
  moves,
  matrix,
  onFocusMove,
}: {
  cell: Cell;
  moves: MoveReading[];
  matrix: ConfusionMatrix;
  onFocusMove?: (ply: number) => void;
}) {
  const inCell = moves.filter(
    (move) =>
      fillsMatrix(move) && move.declared === cell.declared && move.measured === cell.measured,
  );

  return (
    <div data-part="cell-moves" id={CELL_PANEL_ID}>
      <h4>
        {DECLARED_SEVERITY_LABEL[cell.declared]} contre {MEASURED_LABEL[cell.measured]} —{" "}
        {matrix[cell.declared][cell.measured]}
      </h4>
      <ul>
        {inCell.map((move) => (
          <li key={move.ply}>
            <button type="button" onClick={() => onFocusMove?.(move.ply)}>
              {moveName(move.ply, move.notation)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
