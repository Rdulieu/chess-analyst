import { useMemo, useState, type ReactNode } from "react";
import { Chessboard } from "react-chessboard";
import { parseGame } from "../chess/history";
import { formatEvaluation } from "../chess/formatEvaluation";
import { WinningChancesBar } from "./WinningChancesBar";
import { EvaluationGraph } from "./EvaluationGraph";
import { ErrorTallyReadout } from "./ErrorTallyReadout";
import { SEVERITY_GLYPH, SEVERITY_SQUARE_TINT } from "../chess/severity";
import { BOARD_SQUARES } from "../chess/boardTheme";
import type { MoveAnnotation } from "../types";

/**
 * Interactive board for a Game: renders a Position, steps through the Game's
 * Moves one at a time (Previous / Next), and lets the player jump straight to
 * any Move via the move list. Read-only (no dragging) — a history viewer.
 *
 * Navigation is an index into the parsed history: 0 is the starting Position,
 * k is the Position after the k-th half-move. Both stepping and jumping just
 * set that index, so a jumped-to Position is computed identically to a
 * stepped-to one — and castling/en passant/promotion (from cm-chess's rule
 * engine) resolve the same either way.
 *
 * `annotations` (US-7), when present, is index-aligned with the Position
 * index (ply 0 = start) — `annotations[i + 1]` is the Move at `plies[i]`.
 * Drives the move-list glyphs/Evaluations, the current-Position readout and
 * balance bar, and the destination-square tint for the currently-viewed
 * flawed Move. Absent (the toggle off, or a not-yet-analyzed Game) renders
 * exactly as without US-7: no glyph, no Evaluation, no bar, no tint.
 */
export function Board({
  pgn,
  annotations,
  orientation = "white",
  controls,
}: {
  pgn: string;
  annotations?: MoveAnnotation[];
  /**
   * A caller's own control over what the board shows — the annotations toggle
   * today. Taken as a slot rather than left above the board, because everything
   * stacked above the diagram is height the diagram does not get, and the board
   * has to be visible in full. The caller owns the state; this component only
   * decides where it is read, which is beside the board with the rest of the
   * readout.
   */
  controls?: ReactNode;
  /**
   * The `Board orientation` — which side sits at the bottom (CONTEXT.md).
   * Defaults to White so a caller with no side in mind gets the neutral
   * reading. Deliberately an input and not a control: nothing lets the Player
   * flip it, because each view has exactly one orientation that makes sense
   * and it follows from the view.
   */
  orientation?: "white" | "black";
}) {
  const { startFen, plies } = useMemo(() => parseGame(pgn), [pgn]);
  const [index, setIndex] = useState(0);

  const position = index === 0 ? startFen : plies[index - 1].fen;
  const currentMove = index === 0 ? "Start" : plies[index - 1].san;
  const atStart = index === 0;
  const atEnd = index === plies.length;

  const currentAnnotation = annotations?.[index];
  const squareStyles =
    index > 0 && currentAnnotation?.severity
      ? // The CONSTANT variant, not the chrome's: `react-chessboard` paints the
        // piece on top of this square and the piece keeps its ink in both themes
        // (ADR-0013 — the theme-varying tint measured 1.49:1 in dark). This prop
        // is also the reason the tokens are custom properties: a third-party API
        // taking a style object cannot be reached by a class.
        {
          [plies[index - 1].to]: {
            backgroundColor: SEVERITY_SQUARE_TINT[currentAnnotation.severity],
          },
        }
      : undefined;

  return (
    <div>
      {/*
        Two named panes rather than two anonymous divs: the row is the thing the
        stylesheet sizes and reflows, and the board must not resize when the curve
        comes and goes (hiding the annotations must not move the position the
        Player is reading — US-14). The panes carry the names; the sizes are the
        sheet's (`_dense`), which is what makes that constraint one rule instead
        of two components agreeing by luck.

        The pane beside the board is `side` and not `annotations`, because it holds
        the move list too — and a move list is not an annotation: it is there for
        every Game, analysed or not. So the pane never goes away; only its
        annotations do. That is also what stops the move list from starting below
        the fold, behind the whole height of the diagram.
      */}
      <div data-row="board">
        <div data-pane="board">
          <Chessboard
            options={{
              ...BOARD_SQUARES,
              id: "game-board",
              position,
              boardOrientation: orientation,
              allowDragging: false,
              squareStyles,
              showAnimations: false,
            }}
          />
          {/*
            The bar is the BOARD's gauge, so it lives in the board's pane and takes
            the board's width rather than the whole row's. Under the diagram and
            not over it: it comes and goes with the annotations, and nothing above
            the board may move when it does — which is the US-14 constraint, now
            held by the document order instead of by a reserved slot.
          */}
          {currentAnnotation && (
            <WinningChancesBar whiteWinChances={currentAnnotation.whiteWinChances} />
          )}
        </div>
        <div data-pane="side">
          {/*
            The step controls and the current-Move readout are read BESIDE the
            board, which is where the PRD's arrangement puts the readout. They used
            to stack above the row, and the stack was what left the diagram no
            height to be visible in full.
          */}
          {controls}
          <div data-part="stepper">
            <button type="button" onClick={() => setIndex((i) => i - 1)} disabled={atStart}>
              Previous
            </button>
            <button type="button" onClick={() => setIndex((i) => i + 1)} disabled={atEnd}>
              Next
            </button>
          </div>
          {/*
            Deliberately **not** a live region. Stepping through the moves is the
            direct answer to the Player's own click and is already on screen, so
            announcing it only competes for speech with the `Analysis pass` readout —
            which reports something the Player cannot otherwise observe, over minutes
            (US-8). It keeps its accessible name and its text: still queryable, still
            readable, just no longer interrupting.
          */}
          <p aria-label="current move">
            {currentMove}
            {currentAnnotation && ` (${formatEvaluation(currentAnnotation.whiteEval)})`}
          </p>
          {annotations && (
            <>
              {/* Landscape, and deliberately so: squeezed into a narrow column the
                  curve stops being a time axis and reads as a vertical drip. */}
              <div data-part="curve">
                <EvaluationGraph annotations={annotations} currentPly={index} />
              </div>
              <ErrorTallyReadout annotations={annotations} />
            </>
          )}
          <ol aria-label="moves">
            {plies.map((ply, i) => {
              const annotation = annotations?.[i + 1];
              return (
                <li key={i}>
                  <button
                    type="button"
                    aria-current={index === i + 1 ? "true" : undefined}
                    onClick={() => setIndex(i + 1)}
                  >
                    {ply.san}
                  </button>
                  {annotation?.severity && (
                    // The glyph is the signal; `data-severity` only lets the sheet
                    // reinforce it with the severity's own tint and ink. Naming the
                    // severity on the element keeps the stylesheet off the accessible
                    // name, which is a label, not a hook.
                    <span data-severity={annotation.severity} aria-label={annotation.severity}>
                      {SEVERITY_GLYPH[annotation.severity]}
                    </span>
                  )}
                  {annotation && (
                    <span aria-label="evaluation">{formatEvaluation(annotation.whiteEval)}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
