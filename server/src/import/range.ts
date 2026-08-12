import type { Db } from "../db";
import type { ChessComClient, TimeControlCategory } from "../chesscom";
import { importMonth, type ImportResult } from "./service";
import { monthsInRange, type MonthRef } from "./months";

/** The scope of one Import: a contiguous month range and the wanted categories. */
export interface ImportRangeParams {
  username: string;
  from: MonthRef;
  to: MonthRef;
  categories: TimeControlCategory[];
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
  client: ChessComClient,
  params: ImportRangeParams,
  onMonthDone?: (soFar: ImportResult) => void,
): Promise<ImportResult> {
  const total: ImportResult = {
    totalFetched: 0,
    imported: 0,
    alreadyPresent: 0,
    byCategory: { bullet: 0, blitz: 0, rapid: 0, daily: 0 },
    results: { win: 0, loss: 0, draw: 0 },
    months: [],
  };

  for (const month of monthsInRange(params.from, params.to)) {
    let one;
    try {
      one = await importMonth(db, client, {
        username: params.username,
        year: month.year,
        month: month.month,
        categories: params.categories,
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
        failure: err instanceof Error ? err.message : "Import failed",
      });
      onMonthDone?.(snapshot(total));
      continue;
    }
    total.totalFetched += one.totalFetched;
    total.imported += one.imported;
    total.alreadyPresent += one.alreadyPresent;
    for (const c of ["bullet", "blitz", "rapid", "daily"] as const) {
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
