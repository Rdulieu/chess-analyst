import type { Db } from "../db";
import { games } from "../db/schema";
import { gameExistsByUrl } from "../repository";
import type { ChessComClient, TimeControlCategory } from "../chesscom";
import { UnknownUsernameError } from "./errors";
import { toGame } from "./mapping";

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

/**
 * Imports the Player's games for one month from chess.com, mapping each to the
 * Player-relative Game shape and persisting it (incrementally, deduped by URL).
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
