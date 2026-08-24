import type { Db } from "../db";
import { games } from "../db/schema";
import { gameExistsByUrl } from "../repository";
import { recordMoveHabits } from "../move-habits/precompute";
import {
  type ImportedGame,
  type MonthRef,
  type Platform,
  type PlatformClient,
  type TimeControlCategory,
} from "../platform";
import { emptyTally, type ImportResult } from "./service";

/** The scope of one Import: a contiguous month range and the wanted categories. */
export interface ImportRangeParams {
  /** The `Profile` the imported Games belong to (ADR-0014). */
  profileId: number;
  username: string;
  /** The Profile's `Platform` — which adapter this Import fetches through. */
  platform: Platform;
  from: MonthRef;
  to: MonthRef;
  categories: TimeControlCategory[];
  /** Told when the Platform asks the Import to wait (see ImportParams). */
  onWaiting?: (message: string) => void;
}

/**
 * Imports a whole range, **folding the Platform's event stream** into the
 * summary as it arrives.
 *
 * The Import asks the port for the **range** and no longer slices it: how many
 * requests that takes is the Platform's business (ADR-0018, as amended). What
 * the Import still owns is everything the Player's choices govern — which paces
 * to keep, which Profile the Games are filed under — and the *reporting* unit,
 * which is still the month: one line per month of the range, drawn on that
 * month's `month-done` or `month-failed` event.
 *
 * Games are persisted **one at a time as they arrive**, deduplicated by URL.
 * That is what makes an interrupted Import partial rather than lost.
 *
 * `onMonthDone` hands the caller the summary **as it stands after each month**,
 * so a progress readout can show the lines filling in rather than waiting for the
 * whole range; the background job (createImportJob) is its only real user. It
 * receives a snapshot, not the live object, so a caller holding on to it cannot
 * be mutated from under it.
 */
export async function importRange(
  db: Db,
  client: PlatformClient,
  params: ImportRangeParams,
  onMonthDone?: (soFar: ImportResult) => void,
): Promise<ImportResult> {
  const total: ImportResult = {
    totalFetched: 0,
    imported: 0,
    alreadyPresent: 0,
    byCategory: emptyTally(),
    results: { win: 0, loss: 0, draw: 0 },
    months: [],
  };
  const wanted = new Set(params.categories);
  // The month being filled in. A month's line is only pushed when the Platform
  // says the month is over, so its counts accumulate here until then.
  let running = { imported: 0, alreadyPresent: 0 };
  // A Game the store refused, remembered until the month it belongs to closes.
  let unstorable: string | null = null;

  for await (const event of client.fetchRange(params.username, params.from, params.to, {
    onWaiting: params.onWaiting,
  })) {
    if (event.kind === "game") {
      // Which paces to keep is the PLAYER's choice, not a Platform fact — so it
      // stays here while the variant filter lives in the adapter (ADR-0018).
      if (!wanted.has(event.game.timeControlCategory)) continue;
      total.byCategory[event.game.timeControlCategory]++;
      total.results[event.game.result]++;
      try {
        if (insert(db, params.profileId, event.game)) running.imported++;
        else running.alreadyPresent++;
      } catch (err) {
        // A Game whose PGN cannot be replayed fails **its month**, not the range
        // (ADR-0010). Inserting as the stream arrives is what makes an
        // interrupted Import partial rather than lost; it must not also make one
        // bad Game cost every month after it. Over-declaring this month
        // incomplete is the safe direction — the Player can re-run it.
        unstorable ??= err instanceof Error ? err.message : String(err);
      }
      continue;
    }
    // The month is over, one way or another: draw its line.
    //
    // A month carries a `failure` if the Platform could not answer it, or if a
    // Game it did deliver could not be stored. Either way the range carries on
    // (ADR-0010) and whatever DID arrive has already been persisted above — the
    // port yields, so a partial month is partial rather than lost. Recovery is
    // replaying the range, which dedup by URL makes exact.
    if (event.kind === "month-done") total.totalFetched += event.totalFetched;
    const failure = event.kind === "month-failed" ? event.reason : unstorable;
    total.imported += running.imported;
    total.alreadyPresent += running.alreadyPresent;
    total.months.push({
      month: event.month,
      ...running,
      ...(failure === null ? {} : { failure }),
    });
    running = { imported: 0, alreadyPresent: 0 };
    unstorable = null;
    onMonthDone?.(snapshot(total));
  }

  if (total.imported === 0 && total.alreadyPresent === 0) {
    total.message = `No games found for ${yyyymm(params.from)} to ${yyyymm(params.to)} in the selected time control categories.`;
  }
  return total;
}

/** Files one Game under the Profile. `false` when that URL was already there. */
function insert(db: Db, profileId: number, game: ImportedGame): boolean {
  if (gameExistsByUrl(db, profileId, game.gameUrl)) return false;
  const inserted = db.insert(games).values({ ...game, profileId }).returning().get();
  recordMoveHabits(db, inserted);
  return true;
}

/** A detached copy, so a caller keeping the partial summary is never mutated. */
const snapshot = (r: ImportResult): ImportResult => ({
  ...r,
  byCategory: { ...r.byCategory },
  results: { ...r.results },
  months: [...r.months],
});

const yyyymm = ({ year, month }: MonthRef) => `${year}-${String(month).padStart(2, "0")}`;
