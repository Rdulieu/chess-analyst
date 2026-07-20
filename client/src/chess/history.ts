import { Chess } from "cm-chess";

/**
 * The starting Position (FEN) of a Game given its PGN. For a game played from
 * the standard setup this is the standard start position; cm-chess would
 * return the SetUp FEN for a game that began from a custom position.
 *
 * Throws if the PGN cannot be parsed, so a malformed Game surfaces loudly
 * rather than rendering a silently wrong board.
 */
export function startingPosition(pgn: string): string {
  const chess = new Chess();
  chess.loadPgn(pgn);
  return chess.setUpFen();
}
