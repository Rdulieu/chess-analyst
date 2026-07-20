import { Chessboard } from "react-chessboard";
import { startingPosition } from "../chess/history";

/**
 * Presentational board for a Game: renders its starting Position from the PGN.
 * Read-only (no dragging) — this is a history viewer, not a place to play moves.
 * Move navigation is layered on top in later slices (US-1 issues 02/03).
 */
export function Board({ pgn }: { pgn: string }) {
  return (
    <Chessboard
      options={{ id: "game-board", position: startingPosition(pgn), allowDragging: false }}
    />
  );
}
