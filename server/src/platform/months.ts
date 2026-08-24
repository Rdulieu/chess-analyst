import type { MonthRef } from "./types";

/**
 * Month arithmetic over `MonthRef`. It sits beside the port rather than in the
 * Import because **the adapters walk months too** now: chess.com asks for a
 * range by issuing one request per month, and Lichess slices one stream back
 * into months. The Import's *policy* about a range — rejecting an inverted one,
 * clamping a future one — stays in the Import, where it belongs.
 */

/** Months since year 0 — the one ordering every range comparison needs. */
export const monthOrdinal = ({ year, month }: MonthRef) => year * 12 + month;

/** The months a range covers, in order, both bounds included. */
export function monthsInRange(from: MonthRef, to: MonthRef): MonthRef[] {
  const months: MonthRef[] = [];
  let { year, month } = from;
  while (year < to.year || (year === to.year && month <= to.month)) {
    months.push({ year, month });
    if (month === 12) {
      year++;
      month = 1;
    } else {
      month++;
    }
  }
  return months;
}

/** The month a `Game`'s date falls in — how a stream is sliced back into months. */
export function monthOf(date: string): MonthRef {
  const [year, month] = date.split("-");
  return { year: Number(year), month: Number(month) };
}

/**
 * The month a Platform's own instant falls in, **in UTC** — the same frame the
 * export's `since`/`until` window is expressed in, so a Game can never be
 * counted toward a month the request did not ask for because the machine sits in
 * another timezone.
 */
export function monthOfCreatedAt(createdAt: number): MonthRef {
  const at = new Date(createdAt);
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1 };
}
