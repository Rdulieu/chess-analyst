import { Chess } from "cm-chess";

/**
 * Loads a Game's PGN into a board, **tolerating a Game with no moves**.
 *
 * An aborted game is a real Game we keep on purpose (CONTEXT.md, US-12): both
 * Platforms send them, and keeping them on both is what makes the corpus the
 * same kind of thing. Its PGN carries headers, no move at all, and `*` as the
 * result — and the PGN parser rejects that bare `*` where it expects a move. One
 * such game inside a month failed the whole month's import, so the tolerance
 * lives here, in the single place both walkers go through, rather than in each
 * caller.
 *
 * The headers are still loaded: only the empty movetext is dropped, so an
 * aborted Game names its players like any other.
 *
 * Trimmed first: the parser rejects trailing whitespace, and both Platforms
 * serve PGNs with a trailing newline.
 */
export function loadGame(pgn: string): Chess {
  const chess = new Chess();
  const text = pgn.trim();
  chess.loadPgn(hasNoMove(text) ? headerBlock(text) : text);
  return chess;
}

/** Whether the movetext holds no half-move — only a result token, or nothing. */
function hasNoMove(pgn: string): boolean {
  return /^(\*|1-0|0-1|1\/2-1\/2)?$/.test(movetext(pgn));
}

/** Everything after the header block, as one line. */
function movetext(pgn: string): string {
  return pgn
    .split("\n")
    .filter((line) => !line.startsWith("["))
    .join(" ")
    .trim();
}

/** The header lines alone — a PGN the parser accepts, with nothing to walk. */
function headerBlock(pgn: string): string {
  return pgn
    .split("\n")
    .filter((line) => line.startsWith("["))
    .join("\n");
}

/**
 * Every Position of a Game's PGN, ply-indexed: `ply` 0 is the initial
 * Position, `ply` N the Position after the N-th half-move — shared by the
 * analysis pass (ADR-0009) and the `Danger position` derivation, which both
 * need the same per-ply FEN sequence. A Game with no move has exactly one
 * Position, the initial one.
 */
export function gamePositions(pgn: string): string[] {
  const chess = loadGame(pgn);
  return [chess.setUpFen(), ...chess.history().map((move) => move.fen)];
}
