import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { parseGame } from "../chess/history";

/**
 * Interactive board for a Game: renders a Position and steps through the
 * Game's Moves one at a time (Previous / Next), showing the current Move's
 * standard notation. Read-only (no dragging) — this is a history viewer.
 *
 * Navigation is an index into the parsed history: 0 is the starting Position,
 * k is the Position after the k-th half-move. Because positions come from
 * cm-chess's rule engine, castling, en passant and promotion resolve for free.
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
    </div>
  );
}
