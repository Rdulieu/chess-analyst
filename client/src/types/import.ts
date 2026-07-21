import type { TimeControlCategory } from "./game";

/** The scope of one Import: a single month and the wanted time control categories. */
export interface ImportParams {
  username: string;
  year: number;
  month: number;
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
