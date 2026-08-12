import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { parseGame } from "../chess/history";
import { formatEvaluation } from "../chess/formatEvaluation";
import { WinningChancesBar } from "./WinningChancesBar";
import type { MoveAnnotation } from "../types";

const SEVERITY_GLYPH: Record<NonNullable<MoveAnnotation["severity"]>, string> = {
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
};

/** Distinct per-severity board tint — supplementary to the move list's glyph, never the only signal. */
const SEVERITY_TINT: Record<NonNullable<MoveAnnotation["severity"]>, string> = {
  inaccuracy: "#fff3b0",
  mistake: "#ffcc80",
  blunder: "#ff8a80",
};

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
export function Board({ pgn, annotations }: { pgn: string; annotations?: MoveAnnotation[] }) {
  const { startFen, plies } = useMemo(() => parseGame(pgn), [pgn]);
  const [index, setIndex] = useState(0);

  const position = index === 0 ? startFen : plies[index - 1].fen;
  const currentMove = index === 0 ? "Start" : plies[index - 1].san;
  const atStart = index === 0;
  const atEnd = index === plies.length;

  const currentAnnotation = annotations?.[index];
  const squareStyles =
    index > 0 && currentAnnotation?.severity
      ? { [plies[index - 1].to]: { backgroundColor: SEVERITY_TINT[currentAnnotation.severity] } }
      : undefined;

  return (
    <div>
      <div>
        <button type="button" onClick={() => setIndex((i) => i - 1)} disabled={atStart}>
          Previous
        </button>
        <button type="button" onClick={() => setIndex((i) => i + 1)} disabled={atEnd}>
          Next
        </button>
      </div>
      <p role="status" aria-label="current move">
        {currentMove}
        {currentAnnotation && ` (${formatEvaluation(currentAnnotation.whiteEval)})`}
      </p>
      {currentAnnotation && <WinningChancesBar whiteWinChances={currentAnnotation.whiteWinChances} />}
      <Chessboard
        options={{
          id: "game-board",
          position,
          allowDragging: false,
          showAnimations: false,
          squareStyles,
        }}
      />
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
                <span aria-label={annotation.severity}>{SEVERITY_GLYPH[annotation.severity]}</span>
              )}
              {annotation && <span aria-label="evaluation">{formatEvaluation(annotation.whiteEval)}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
