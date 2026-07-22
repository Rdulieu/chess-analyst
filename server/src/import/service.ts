import type { Db } from "../db";
import { games } from "../db/schema";
import { gameExistsByUrl } from "../repository";
import { recordMoveHabits } from "../move-habits/precompute";
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
  /** Total games chess.com returned for the month (all categories/variants). */
  totalFetched: number;
  imported: number;
  alreadyPresent: number;
  /** In-scope games per time control category (chosen categories, standard chess). */
  byCategory: Record<TimeControlCategory, number>;
  /** The Player's win/draw/loss tally over the in-scope games. */
  results: { win: number; loss: number; draw: number };
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
  const byCategory: Record<TimeControlCategory, number> = { bullet: 0, blitz: 0, rapid: 0, daily: 0 };
  const results = { win: 0, loss: 0, draw: 0 };
  for (const game of monthGames) {
    if (game.rules !== "chess") continue;
    if (!wanted.has(game.time_class)) continue;
    const mapped = toGame(game, params.username);
    byCategory[mapped.timeControlCategory]++;
    results[mapped.result]++;
    if (gameExistsByUrl(db, game.url)) {
      alreadyPresent++;
      continue;
    }
    const inserted = db.insert(games).values(mapped).returning().get();
    recordMoveHabits(db, inserted);
    imported++;
  }
  const summary: ImportResult = {
    totalFetched: monthGames.length,
    imported,
    alreadyPresent,
    byCategory,
    results,
  };
  if (imported === 0 && alreadyPresent === 0) {
    const yyyymm = `${params.year}-${String(params.month).padStart(2, "0")}`;
    summary.message = `No games found for ${yyyymm} in the selected time control categories.`;
  }
  return summary;
}
