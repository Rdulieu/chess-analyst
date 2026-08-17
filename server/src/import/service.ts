import type { Db } from "../db";
import { games } from "../db/schema";
import { gameExistsByUrl } from "../repository";
import { recordMoveHabits } from "../move-habits/precompute";
import type { ChessComClient, TimeControlCategory } from "../chesscom";
import { toGame } from "./mapping";

export interface ImportParams {
  /** The `Profile` the imported Games belong to — never another's (ADR-0014). */
  profileId: number;
  username: string;
  year: number;
  month: number;
  categories: TimeControlCategory[];
}

/**
 * One month's slice of an Import — the unit the Player is shown progress and
 * outcome by (CONTEXT.md, "Monthly import"). A month with no entry in the
 * Player's history is reported at zero like any other; only a month chess.com
 * could not answer for carries a `failure`, so a gap in the history stays
 * distinguishable from a gap in the fetching.
 */
export interface MonthlyImport {
  month: { year: number; month: number };
  imported: number;
  alreadyPresent: number;
  /** Set only when the month could not be fetched; absent means covered. */
  failure?: string;
}

/** The figures an Import reports, whether over one month or a whole range. */
export interface ImportFigures {
  /** Total games chess.com returned (all categories/variants). */
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
 * An Import's summary: the figures **consolidated over the whole range**, plus
 * one line per month for traceability. The rich aggregates are deliberately not
 * repeated per month — a 12 x 9 table of numbers is not a summary (ADR-0010).
 */
export interface ImportResult extends ImportFigures {
  months: MonthlyImport[];
}

/**
 * Imports the Player's games for one month from chess.com, mapping each to the
 * Player-relative Game shape and persisting it (incrementally, deduped by URL).
 *
 * The username is **not** validated here: an Import spans a range of months and
 * the check is made once by the route, before any month is fetched (ADR-0010).
 */
export async function importMonth(
  db: Db,
  client: ChessComClient,
  params: ImportParams,
): Promise<ImportFigures> {
  const monthGames = await client.fetchMonth(params.username, params.year, params.month);
  const wanted = new Set(params.categories);
  let imported = 0;
  let alreadyPresent = 0;
  const byCategory: Record<TimeControlCategory, number> = { bullet: 0, blitz: 0, rapid: 0, daily: 0 };
  const results = { win: 0, loss: 0, draw: 0 };
  for (const game of monthGames) {
    if (game.rules !== "chess") continue;
    if (!wanted.has(game.time_class)) continue;
    const mapped = toGame(game, params.username, params.profileId);
    byCategory[mapped.timeControlCategory]++;
    results[mapped.result]++;
    if (gameExistsByUrl(db, params.profileId, game.url)) {
      alreadyPresent++;
      continue;
    }
    const inserted = db.insert(games).values(mapped).returning().get();
    recordMoveHabits(db, inserted);
    imported++;
  }
  const summary: ImportFigures = {
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
