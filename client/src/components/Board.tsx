import { useMemo, useState, type ReactNode } from "react";
import { Chessboard } from "react-chessboard";
import { parseGame } from "../chess/history";
import { formatEvaluation } from "../chess/formatEvaluation";
import { WinningChancesBar } from "./WinningChancesBar";
import { EvaluationGraph } from "./EvaluationGraph";
import { ErrorTallyReadout } from "./ErrorTallyReadout";
import { MoveRecord } from "../features/analysis/MoveRecord";
import { reviewedMove, type LinePly } from "../chess/bestLine";
import { SEVERITY_GLYPH, SEVERITY_SQUARE_TINT } from "../chess/severity";
import { PHASE_START_LABEL, phaseStarts } from "../chess/phase";
import { marksUncounted } from "../chess/counted";
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
 * flawed Move. Absent (Unaided, or a not-yet-analyzed Game) renders
 * exactly as without US-7: no glyph, no Evaluation, no bar, no tint.
 */
export function Board({
  pgn,
  annotations,
  detailed = false,
  orientation = "white",
  controls,
}: {
  pgn: string;
  annotations?: MoveAnnotation[];
  /**
   * The `Review mode`'s **Detailed** level (CONTEXT.md): also show the reviewed
   * Move's own record. A level above `annotations` and never below it — the
   * caller passes a point on a scale, so there is no state where the record
   * appears without the annotations it comments on.
   */
  detailed?: boolean;
  /**
   * A caller's own control over what the board shows — the `Review mode`'s
   * level control today. Taken as a slot rather than left above the board, because everything
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
  /**
   * A Position shown **temporarily**, while the Player points at (or focuses) a
   * ply inside a `Best line`. Deliberately a second, separate piece of state:
   * `index` stays the single source of where the Player *is*, so the readout,
   * the balance bar, the square tint and the curve's cursor all keep naming the
   * Move actually being reviewed while the board shows the previewed Position.
   */
  const [preview, setPreview] = useState<{ focus: string | null; hover: string | null }>({
    focus: null,
    hover: null,
  });

  const navigated = index === 0 ? startFen : plies[index - 1].fen;
  // The focus wins over the pointer: the pointer is the same control's mouse
  // affordance, and a Player reading the line by keyboard must not lose the
  // preview because the mouse drifted off the button that still holds focus.
  const position = preview.focus ?? preview.hover ?? navigated;
  const currentMove = index === 0 ? "Start" : plies[index - 1].san;
  const atStart = index === 0;
  const atEnd = index === plies.length;

  /**
   * Moves the Player. Navigating also ends any preview: a previewed Position
   * belongs to the line of the Move that was being read, and would otherwise
   * outlive it — the board would show one Move's variation while everything
   * beside it named another.
   */
  const goTo = (next: number) => {
    setIndex(next);
    setPreview({ focus: null, hover: null });
  };

  /** Reports one channel's preview without disturbing the other's. */
  const previewVia = (fen: string | null, via: "focus" | "hover") =>
    setPreview((current) => ({ ...current, [via]: fen }));

  /**
   * The reviewed Move's record — computed once, read twice: the panel names its
   * lines, the board draws their first Move. Two derivations of "the record"
   * could drift apart; one cannot.
   */
  const record = useMemo(
    () =>
      annotations
        ? reviewedMove(
            annotations,
            index,
            index > 1 ? plies[index - 2].fen : startFen,
            navigated,
          )
        : null,
    [annotations, index, plies, startFen, navigated],
  );

  /**
   * Where the `Phase`s begin, by ply — the boundaries marked IN the move list, so
   * a frontier is something the Player sees while scanning rather than something
   * they have to click every Move to discover. At most two, because the
   * derivation latches; none at all on a Game that never leaves the start.
   */
  const phaseStartAt = useMemo(
    () => new Map(annotations ? phaseStarts(annotations).map((s) => [s.ply, s.phase]) : []),
    [annotations],
  );

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

  /**
   * The board's arrows for the record: the Move that should have been played,
   * and the opponent's best reply to the one that was. Only the **first** ply of
   * each line — an arrow per ply would draw the whole line at once and say
   * nothing about its order.
   */
  const recordArrows = record
    ? [
        arrowFor(record.shouldHavePlayed[0], "var(--arrow-best-line)"),
        arrowFor(record.refutation[0], "var(--arrow-refutation)"),
      ].filter((arrow): arrow is BoardArrow => arrow !== null)
    : [];

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
              // The first Move of each of the record's lines, drawn: turning a
              // notation back into a Position is precisely the skill the Player
              // has not acquired yet. Each line is also named in the panel's
              // text, so an arrow's colour is never the only carrier.
              arrows: recordArrows,
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
          {/*
            The way to the record, from beside the board. The panel itself is
            BELOW the row — that is deliberate, its height varies and nothing
            above the diagram may move — so without this the Player would have to
            already know it exists. Scrolling to reach it is acceptable; not
            knowing it is there is not. Only in Detailed, because that is the
            only level at which there is anything to reach.
          */}
          {detailed && <a href="#move-record-heading">Aller au relevé du coup</a>}
          <div data-part="stepper">
            <button type="button" onClick={() => goTo(index - 1)} disabled={atStart}>
              Previous
            </button>
            <button type="button" onClick={() => goTo(index + 1)} disabled={atEnd}>
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
            {plies.flatMap((ply, i) => {
              const annotation = annotations?.[i + 1];
              const phaseStart = phaseStartAt.get(i + 1);
              return [
                // The mark sits in the list, just before the Move that opens the
                // Phase, and says which Phase in words: a boundary carried by a
                // tint would be unreadable aloud and invisible to a Player who
                // does not know the code (ADR-0013).
                phaseStart && (
                  <li key={`phase-${i}`} data-part="phase-start">
                    {PHASE_START_LABEL[phaseStart]}
                  </li>
                ),
                <li key={i}>
                  <button
                    type="button"
                    aria-current={index === i + 1 ? "true" : undefined}
                    onClick={() => goTo(i + 1)}
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
                  {annotation && marksUncounted(annotation) && (
                    // Beside the severity glyph, which keeps carrying the fault:
                    // this says the analysis does not hold the Player to it. In
                    // text, with its own accessible name — a tint alone could
                    // only ever mean "something", not "not counted" (ADR-0013).
                    <span data-part="uncounted" aria-label="non compté">
                      non compté
                    </span>
                  )}
                  {annotation && (
                    <span aria-label="evaluation">{formatEvaluation(annotation.whiteEval)}</span>
                  )}
                </li>,
              ].filter(Boolean);
            })}
          </ol>
        </div>
      </div>
      {/*
        The reviewed Move's record, **below** the row and outside both panes: its
        height is whatever its lines need, and everything stacked above the
        diagram is height the diagram does not get (US-14's constraint, held here
        by the document order). Shown at the `Review mode`'s **Detailed** level only
        (CONTEXT.md): Annotated is exactly what US-7 and US-14 delivered, and the
        record is what Detailed adds to it.
      */}
      {annotations && detailed && (
        <MoveRecord
          record={record}
          phase={currentAnnotation?.phase ?? null}
          counted={currentAnnotation?.counted ?? null}
          onPreview={previewVia}
        />
      )}
    </div>
  );
}

/** One board arrow, as `react-chessboard` takes them. */
interface BoardArrow {
  startSquare: string;
  endSquare: string;
  color: string;
}

/** The arrow for a line's first ply, or `null` for a line with no ply to draw. */
function arrowFor(ply: LinePly | undefined, color: string): BoardArrow | null {
  return ply ? { startSquare: ply.from, endSquare: ply.to, color } : null;
}
