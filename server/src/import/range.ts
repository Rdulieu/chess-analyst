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
 * `onMonthDone` lets the caller advance a progress readout without exposing the
 * loop itself; the background job (createImportJob) is its only real user.
 */
export async function importRange(
  db: Db,
  client: ChessComClient,
  params: ImportRangeParams,
  onMonthDone?: () => void,
): Promise<ImportResult> {
  const total: ImportResult = {
    totalFetched: 0,
    imported: 0,
    alreadyPresent: 0,
    byCategory: { bullet: 0, blitz: 0, rapid: 0, daily: 0 },
    results: { win: 0, loss: 0, draw: 0 },
  };

  for (const month of monthsInRange(params.from, params.to)) {
    const one = await importMonth(db, client, {
      username: params.username,
      year: month.year,
      month: month.month,
      categories: params.categories,
    });
    total.totalFetched += one.totalFetched;
    total.imported += one.imported;
    total.alreadyPresent += one.alreadyPresent;
    for (const c of ["bullet", "blitz", "rapid", "daily"] as const) {
      total.byCategory[c] += one.byCategory[c];
    }
    total.results.win += one.results.win;
    total.results.draw += one.results.draw;
    total.results.loss += one.results.loss;
    onMonthDone?.();
  }

  if (total.imported === 0 && total.alreadyPresent === 0) {
    total.message = `No games found for ${yyyymm(params.from)} to ${yyyymm(params.to)} in the selected time control categories.`;
  }
  return total;
}

const yyyymm = ({ year, month }: MonthRef) => `${year}-${String(month).padStart(2, "0")}`;
