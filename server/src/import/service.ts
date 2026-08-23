import type { Db } from "../db";
import { games } from "../db/schema";
import { gameExistsByUrl } from "../repository";
import { recordMoveHabits } from "../move-habits/precompute";
import {
  TIME_CONTROL_CATEGORIES,
  TruncatedStreamError,
  type FetchHooks,
  type ImportedGame,
  type PlatformClient,
  type TimeControlCategory,
} from "../platform";

/** A per-category tally at zero — one entry per category, never a subset. */
export const emptyTally = (): Record<TimeControlCategory, number> =>
  Object.fromEntries(TIME_CONTROL_CATEGORIES.map((c) => [c, 0])) as Record<
    TimeControlCategory,
    number
  >;

export interface ImportParams {
  /** The `Profile` the imported Games belong to — never another's (ADR-0014). */
  profileId: number;
  username: string;
  year: number;
  month: number;
  categories: TimeControlCategory[];
  /**
   * Told when the Platform asks us to wait rather than answering. It travels
   * with the Import because only the adapter knows a wait happened, and only the
   * caller can put it on screen.
   */
  onWaiting?: FetchHooks["onWaiting"];
}

/**
 * One month's slice of an Import — the unit the Player is shown progress and
 * outcome by (CONTEXT.md, "Monthly import"). A month with no entry in the
 * Player's history is reported at zero like any other; only a month the Platform
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
  /** Total games the Platform returned (all categories, out-of-scope included). */
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
 * Imports the Player's games for one month from the Profile's `Platform`, filing
 * each under the Profile and persisting it (incrementally, deduped by URL).
 *
 * The username is **not** validated here: an Import spans a range of months and
 * the check is made once by the route, before any month is fetched (ADR-0010).
 */
export async function importMonth(
  db: Db,
  client: PlatformClient,
  params: ImportParams,
): Promise<ImportFigures> {
  let fetched;
  try {
    fetched = await client.fetchMonth(params.username, params.year, params.month, {
      onWaiting: params.onWaiting,
    });
  } catch (err) {
    // A stream cut mid-body still delivered Games, and the Platform already paid
    // to send them. They are persisted before the failure is handed on: the
    // month must not read as covered, but it must not cost the Player what did
    // arrive either (dedup by URL makes the re-run add exactly the rest).
    if (err instanceof TruncatedStreamError) persist(db, params, err.partial.games);
    throw err;
  }
  const { totalFetched, games: monthGames } = fetched;
  const { imported, alreadyPresent, byCategory, results } = persist(db, params, monthGames);
  const summary: ImportFigures = {
    totalFetched,
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

/**
 * Files the in-scope Games under the Profile, deduped by URL, and tallies what
 * happened. Split out because it runs over a **partial** fetch just as well as a
 * whole one: a truncated stream's Games are persisted on exactly this path, so
 * there is no second, subtly different way of storing a Game.
 */
function persist(db: Db, params: ImportParams, fetchedGames: ImportedGame[]) {
  const wanted = new Set(params.categories);
  let imported = 0;
  let alreadyPresent = 0;
  const byCategory = emptyTally();
  const results = { win: 0, loss: 0, draw: 0 };
  for (const game of fetchedGames) {
    // Which paces to keep is the PLAYER's choice, not a Platform fact — so it
    // stays here while the variant filter went into the adapter (ADR-0018).
    if (!wanted.has(game.timeControlCategory)) continue;
    const mapped = { ...game, profileId: params.profileId };
    byCategory[mapped.timeControlCategory]++;
    results[mapped.result]++;
    if (gameExistsByUrl(db, params.profileId, game.gameUrl)) {
      alreadyPresent++;
      continue;
    }
    const inserted = db.insert(games).values(mapped).returning().get();
    recordMoveHabits(db, inserted);
    imported++;
  }
  return { imported, alreadyPresent, byCategory, results };
}
