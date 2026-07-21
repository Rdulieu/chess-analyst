import type { Db } from "./db";
import { games, type NewGame } from "./db/schema";
import { gameExistsByUrl } from "./repository";
import type { ChessComClient, ChessComGame, TimeControlCategory } from "./chesscom";

export interface ImportParams {
  username: string;
  year: number;
  month: number;
  categories: TimeControlCategory[];
}

export interface ImportResult {
  imported: number;
  alreadyPresent: number;
  /** Set when nothing matched, so the caller can tell the Player why. */
  message?: string;
}

/** Thrown when the chess.com username to import does not exist. */
export class UnknownUsernameError extends Error {
  constructor(username: string) {
    super(`Unknown chess.com username: ${username}`);
    this.name = "UnknownUsernameError";
  }
}

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
function normalizeResult(code: string): "win" | "loss" | "draw" {
  if (code === "win") return "win";
  if (DRAW_CODES.has(code)) return "draw";
  return "loss";
}

/** Maps a chess.com game to the Player-relative Game shape. */
function toGame(game: ChessComGame, username: string): NewGame {
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

/**
 * Imports the Player's games for one month from chess.com, mapping each to the
 * Player-relative Game shape and persisting it.
 */
export async function importMonth(
  db: Db,
  client: ChessComClient,
  params: ImportParams,
): Promise<ImportResult> {
  if (!(await client.playerExists(params.username))) {
    throw new UnknownUsernameError(params.username);
  }
  const monthGames = await client.fetchMonth(params.username, params.year, params.month);
  const wanted = new Set(params.categories);
  let imported = 0;
  let alreadyPresent = 0;
  for (const game of monthGames) {
    if (game.rules !== "chess") continue;
    if (!wanted.has(game.time_class)) continue;
    if (gameExistsByUrl(db, game.url)) {
      alreadyPresent++;
      continue;
    }
    db.insert(games).values(toGame(game, params.username)).run();
    imported++;
  }
  if (imported === 0 && alreadyPresent === 0) {
    const yyyymm = `${params.year}-${String(params.month).padStart(2, "0")}`;
    return {
      imported,
      alreadyPresent,
      message: `No games found for ${yyyymm} in the selected time control categories.`,
    };
  }
  return { imported, alreadyPresent };
}
