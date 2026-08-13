import { Chess } from "cm-chess";

function replay(sans: string[]): Chess {
  const chess = new Chess();
  for (const san of sans) chess.move(san);
  return chess;
}

/**
 * The Position (4-field FEN: placement, active colour, castling, en passant)
 * reached by replaying `sans` from the standard starting Position. Replaying
 * from the start — rather than loading an intermediate FEN — reproduces exactly
 * the key the server's precomputation stored (same cm-chess rule engine, same
 * en-passant handling), so the explorer can look the resulting Position up.
 */
export function positionAfter(sans: string[]): string {
  return replay(sans).fen().split(" ").slice(0, 4).join(" ");
}

/**
 * The side to move in a Position — the FEN's active-colour field.
 *
 * Read off the string rather than through the rule engine so it works on the
 * **4-field FEN** a `Danger position` is stored under just as well as on a full
 * one. The side to move is a property of the Position itself, and is distinct
 * from the `Board orientation` it happens to be shown with (CONTEXT.md).
 */
export function sideToMove(fen: string): "white" | "black" {
  return fen.split(" ")[1] === "b" ? "black" : "white";
}

/** The full FEN reached by replaying `sans`, for rendering the board. */
export function boardFen(sans: string[]): string {
  return replay(sans).fen();
}
