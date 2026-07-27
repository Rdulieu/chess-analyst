import { Chess } from "cm-chess";

/**
 * Every Position of a Game's PGN, ply-indexed: `ply` 0 is the initial
 * Position, `ply` N the Position after the N-th half-move — shared by the
 * analysis pass (ADR-0009) and the `Danger position` derivation, which both
 * need the same per-ply FEN sequence.
 */
export function gamePositions(pgn: string): string[] {
  const chess = new Chess();
  chess.loadPgn(pgn.trim());
  return [chess.setUpFen(), ...chess.history().map((move) => move.fen)];
}
