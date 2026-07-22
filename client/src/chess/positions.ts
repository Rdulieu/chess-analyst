import { Chess } from "cm-chess";

/**
 * The Position (4-field FEN: placement, active colour, castling, en passant)
 * reached by replaying `sans` from the standard starting Position. Replaying
 * from the start — rather than loading an intermediate FEN — reproduces exactly
 * the key the server's precomputation stored (same cm-chess rule engine, same
 * en-passant handling), so the explorer can look the resulting Position up.
 */
export function positionAfter(sans: string[]): string {
  const chess = new Chess();
  for (const san of sans) chess.move(san);
  return chess.fen().split(" ").slice(0, 4).join(" ");
}
