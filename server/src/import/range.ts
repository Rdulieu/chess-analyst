import type { Db } from "../db";
import {
  TIME_CONTROL_CATEGORIES,
  type Platform,
  type PlatformClient,
  type TimeControlCategory,
} from "../platform";
import { emptyTally, importMonth, type ImportResult } from "./service";
import { monthsInRange, type MonthRef } from "./months";

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
 * Imports every month of the range, **in order, one at a time** (ADR-0010:
 * parallel fetches would only pile responses in memory while the synchronous
 * per-Game insert loop catches up, and would multiply the rate-limit risk).
 * This only orchestrates — `importMonth` keeps doing the fetching, mapping,
 * deduplication and persistence for one month.
 *
 * `onMonthDone` hands the caller the summary **as it stands after each month**,
 * so a progress readout can show the lines filling in rather than waiting for
 * the whole range; the background job (createImportJob) is its only real user.
 * It receives a snapshot, not the live object, so a caller holding on to it
 * cannot be mutated from under it.
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

  for (const month of monthsInRange(params.from, params.to)) {
    let one;
    try {
      one = await importMonth(db, client, {
        profileId: params.profileId,
        username: params.username,
        year: month.year,
        month: month.month,
        categories: params.categories,
        onWaiting: params.onWaiting,
      });
    } catch (err) {
      // One unanswerable month does not abort the Import (ADR-0010): the failure
      // rides on that month's line and the remaining months are still covered.
      // Recovery is replaying the range — deduplication by URL makes that import
      // exactly what is missing — so there is deliberately no retry here.
      total.months.push({
        month,
        imported: 0,
        alreadyPresent: 0,
        // Not everything thrown is an Error — a PGN parser can throw its own
        // class — and "Import failed" tells the Player nothing they can act on.
        failure: err instanceof Error ? err.message : `Import failed: ${String(err)}`,
      });
      onMonthDone?.(snapshot(total));
      continue;
    }
    total.totalFetched += one.totalFetched;
    total.imported += one.imported;
    total.alreadyPresent += one.alreadyPresent;
    for (const c of TIME_CONTROL_CATEGORIES) {
      total.byCategory[c] += one.byCategory[c];
    }
    total.results.win += one.results.win;
    total.results.draw += one.results.draw;
    total.results.loss += one.results.loss;
    total.months.push({ month, imported: one.imported, alreadyPresent: one.alreadyPresent });
    onMonthDone?.(snapshot(total));
  }

  if (total.imported === 0 && total.alreadyPresent === 0) {
    total.message = `No games found for ${yyyymm(params.from)} to ${yyyymm(params.to)} in the selected time control categories.`;
  }
  return total;
}

/** A detached copy, so a caller keeping the partial summary is never mutated. */
const snapshot = (r: ImportResult): ImportResult => ({
  ...r,
  byCategory: { ...r.byCategory },
  results: { ...r.results },
  months: [...r.months],
});

const yyyymm = ({ year, month }: MonthRef) => `${year}-${String(month).padStart(2, "0")}`;
