import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { parseGame } from "../chess/history";

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
 */
export function Board({ pgn }: { pgn: string }) {
  const { startFen, plies } = useMemo(() => parseGame(pgn), [pgn]);
  const [index, setIndex] = useState(0);

  const position = index === 0 ? startFen : plies[index - 1].fen;
  const currentMove = index === 0 ? "Start" : plies[index - 1].san;
  const atStart = index === 0;
  const atEnd = index === plies.length;

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
      </p>
      <Chessboard
        options={{
          id: "game-board",
          position,
          allowDragging: false,
          showAnimations: false,
        }}
      />
      <ol aria-label="moves">
        {plies.map((ply, i) => (
          <li key={i}>
            <button
              type="button"
              aria-current={index === i + 1 ? "true" : undefined}
              onClick={() => setIndex(i + 1)}
            >
              {ply.san}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
