import type { TimeControlCategory } from "./game";

/** One bound of an Import's month range. */
export interface MonthRef {
  year: number;
  /** 1-12. */
  month: number;
}

/**
 * The scope of one Import: the `Profile` it runs for — an Import is an
 * operation ON a Profile (ADR-0014) — a contiguous month range, and the wanted
 * categories. No username: the account is the Profile's own.
 */
export interface ImportParams {
  profileId: number;
  from: MonthRef;
  to: MonthRef;
  categories: TimeControlCategory[];
}

/**
 * One month's slice of an Import — the unit the Player is shown outcome by.
 * A month the Player was inactive in reads as zeros; only a month chess.com
 * could not answer for carries a `failure`.
 */
export interface MonthlyImport {
  month: MonthRef;
  imported: number;
  alreadyPresent: number;
  failure?: string;
}

/** Outcome of an Import — the figures shown in the post-import summary. */
export interface ImportResult {
  totalFetched: number;
  imported: number;
  alreadyPresent: number;
  byCategory: Record<TimeControlCategory, number>;
  results: { win: number; loss: number; draw: number };
  /** One line per month of the range, in order. */
  months: MonthlyImport[];
  message?: string;
}

/** Determinate progress of an Import, counted in months (ADR-0010). */
export interface ImportStatus {
  running: boolean;
  total: number;
  done: number;
  /** The range's consolidated summary; null until the Import has finished. */
  result: ImportResult | null;
}
