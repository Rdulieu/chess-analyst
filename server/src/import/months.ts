/** One bound of an Import's month range: a chess.com monthly archive's year/month. */
export interface MonthRef {
  year: number;
  /** 1-12. */
  month: number;
}

/** Months since year 0 — the one ordering every range comparison needs. */
const ordinal = ({ year, month }: MonthRef) => year * 12 + month;

/**
 * Validates and normalizes an Import's range against the current month.
 *
 * - **Inverted** (first month after last): rejected outright — `null`. That is
 *   an incoherent entry, not something to silently repair.
 * - **Last month in the future**: clamped to the current month. A future month
 *   answers zero games, and a zero line reads as a hole in the Player's history
 *   rather than as "not yet played" — a false negative worth avoiding.
 *
 * The range length is deliberately **not** capped (ADR-0010): rebuilding a whole
 * history in one Import is the very use US-9 exists for. The typo risk is caught
 * where it happens, by the UI asking for confirmation on a very long range.
 *
 * `now` is a parameter rather than read from the clock inside, so the clamping
 * is testable without depending on the month the test happens to run in.
 */
export function normalizeRange(
  from: MonthRef,
  to: MonthRef,
  now: MonthRef,
): { from: MonthRef; to: MonthRef } | null {
  if (ordinal(from) > ordinal(to)) return null;
  return { from, to: ordinal(to) > ordinal(now) ? { ...now } : to };
}

/** The months an Import covers, in order, both bounds included. */
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
