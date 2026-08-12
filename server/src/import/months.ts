/** One bound of an Import's month range: a chess.com monthly archive's year/month. */
export interface MonthRef {
  year: number;
  /** 1-12. */
  month: number;
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
