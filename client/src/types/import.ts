import type { TimeControlCategory } from "./game";

/** One bound of an Import's month range. */
export interface MonthRef {
  year: number;
  /** 1-12. */
  month: number;
}

/** The scope of one Import: a contiguous month range and the wanted categories. */
export interface ImportParams {
  username: string;
  from: MonthRef;
  to: MonthRef;
  categories: TimeControlCategory[];
}

/** Outcome of an Import — the figures shown in the post-import summary. */
export interface ImportResult {
  totalFetched: number;
  imported: number;
  alreadyPresent: number;
  byCategory: Record<TimeControlCategory, number>;
  results: { win: number; loss: number; draw: number };
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
