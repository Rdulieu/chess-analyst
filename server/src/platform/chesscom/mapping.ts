import type { ImportedGame } from "../types";
import type { ChessComGame } from "./payload";
import { parseOpening } from "./opening";

/**
 * chess.com's half of ADR-0016: the pure translation from chess.com's game
 * shape into the Player-relative `ImportedGame` (see CONTEXT.md). No I/O — the
 * densest, most edge-case-prone part of the adapter, isolated here so it can be
 * unit-tested on its own.
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

/**
 * Whether this game is one we study at all: standard chess only. A variant is
 * **never** a Game — an aggregate keyed by FEN or ECO would stop meaning what it
 * claims. The exclusion lives here because "rules" is a chess.com word.
 */
export function isInScope(game: ChessComGame): boolean {
  return game.rules === "chess";
}

/**
 * Maps a chess.com game to the Player-relative shape. Who the Profile is stays
 * the Import's business (ADR-0014) — the adapter only says what the Platform
 * said, from the Player's point of view.
 */
export function toImportedGame(game: ChessComGame, username: string): ImportedGame {
  const isWhite = game.white.username.toLowerCase() === username.toLowerCase();
  const [self, other] = isWhite ? [game.white, game.black] : [game.black, game.white];
  const { eco, openingName } = parseOpening(game.pgn);
  return {
    gameUrl: game.url,
    pgn: game.pgn,
    opponent: other.username,
    playerColor: isWhite ? "white" : "black",
    result: normalizeResult(self.result),
    date: new Date(game.end_time * 1000).toISOString().slice(0, 10),
    timeControlCategory: game.time_class,
    eco,
    openingName,
  };
}

/**
 * A month's worth of chess.com games as the port describes it: `totalFetched`
 * counts **everything chess.com returned**, variants included; `games` carries
 * only what is in scope.
 */
export function toMonthFetch(payload: ChessComGame[], username: string) {
  return {
    totalFetched: payload.length,
    games: payload.filter(isInScope).map((game) => toImportedGame(game, username)),
  };
}
