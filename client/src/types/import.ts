import type { TimeControlCategory } from "./game";

/** The scope of one Import: a single month and the wanted time control categories. */
export interface ImportParams {
  username: string;
  year: number;
  month: number;
  categories: TimeControlCategory[];
}

/** Outcome of an Import (the summary window in issue 03 enriches this). */
export interface ImportResult {
  imported: number;
  alreadyPresent: number;
  message?: string;
}
