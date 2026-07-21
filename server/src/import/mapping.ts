import type { NewGame } from "../db/schema";
import type { ChessComGame } from "../chesscom";

/**
 * Pure translation from chess.com's game shape to the Player-relative `Game`
 * (see CONTEXT.md). No I/O — the densest, most edge-case-prone part of Import,
 * isolated here so it can be unit-tested on its own.
 */

/** chess.com result codes that denote a draw (both sides carry the same one). */
const DRAW_CODES = new Set([
  "agreed",
  "stalemate",
  "repetition",
  "insufficient",
  "50move",
  "timevsinsufficient",
]);

/** Normalizes a chess.com side result code to the Player-relative result. */
export function normalizeResult(code: string): "win" | "loss" | "draw" {
  if (code === "win") return "win";
  if (DRAW_CODES.has(code)) return "draw";
  return "loss";
}

/** Maps a chess.com game to the Player-relative Game shape. */
export function toGame(game: ChessComGame, username: string): NewGame {
  const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
  const [self, other] = isWhite ? [game.white, game.black] : [game.black, game.white];
  return {
    gameUrl: game.url,
    pgn: game.pgn,
    opponent: other.username,
    playerColor: isWhite ? "white" : "black",
    result: normalizeResult(self.result),
    date: new Date(game.end_time * 1000).toISOString().slice(0, 10),
    timeControlCategory: game.time_class,
  };
}
