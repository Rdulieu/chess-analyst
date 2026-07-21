import { Chess } from "cm-chess";

/** A half-move: its standard notation and the Position (FEN) it leads to. */
export interface Ply {
  san: string;
  fen: string;
}

/** A Game's navigable history: the starting Position plus every half-move. */
export interface GameHistory {
  startFen: string;
  plies: Ply[];
}

/**
 * The starting Position (FEN) of a Game given its PGN. For a game played from
 * the standard setup this is the standard start position; cm-chess would
 * return the SetUp FEN for a game that began from a custom position.
 *
 * Throws if the PGN cannot be parsed, so a malformed Game surfaces loudly
 * rather than rendering a silently wrong board.
 */
export function startingPosition(pgn: string): string {
  return parseGame(pgn).startFen;
}

/**
 * Parses a Game's PGN into a navigable history. Each ply carries the Position
 * that results from it (cm-chess computes these with its rule engine, so
 * castling, en passant and promotion are handled for us). Throws on an
 * unparseable PGN.
 */
export function parseGame(pgn: string): GameHistory {
  const chess = new Chess();
  chess.loadPgn(pgn);
  return {
    startFen: chess.setUpFen(),
    plies: chess.history().map((move) => ({ san: move.san, fen: move.fen })),
  };
}
