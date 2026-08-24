import {
  TIME_CONTROL_CATEGORIES,
  type FetchHooks,
  type MonthRef,
  type TimeControlCategory,
} from "../platform";

/** A per-category tally at zero — one entry per category, never a subset. */
export const emptyTally = (): Record<TimeControlCategory, number> =>
  Object.fromEntries(TIME_CONTROL_CATEGORIES.map((c) => [c, 0])) as Record<
    TimeControlCategory,
    number
  >;

export interface ImportParams {
  /** The `Profile` the imported Games belong to — never another's (ADR-0014). */
  profileId: number;
  username: string;
  categories: TimeControlCategory[];
  /**
   * Told when the Platform asks us to wait rather than answering. It travels
   * with the Import because only the adapter knows a wait happened, and only the
   * caller can put it on screen.
   */
  onWaiting?: FetchHooks["onWaiting"];
}

/**
 * One month's slice of an Import — the unit the Player is shown progress and
 * outcome by (CONTEXT.md, "Monthly import"). A month with no entry in the
 * Player's history is reported at zero like any other; only a month the Platform
 * could not answer for carries a `failure`, so a gap in the history stays
 * distinguishable from a gap in the fetching.
 */
export interface MonthlyImport {
  month: MonthRef;
  imported: number;
  alreadyPresent: number;
  /** Set only when the month could not be fetched; absent means covered. */
  failure?: string;
}

/** The figures an Import reports, whether over one month or a whole range. */
export interface ImportFigures {
  /** Total games the Platform returned (all categories, out-of-scope included). */
  totalFetched: number;
  imported: number;
  alreadyPresent: number;
  /** In-scope games per time control category (chosen categories, standard chess). */
  byCategory: Record<TimeControlCategory, number>;
  /** The Player's win/draw/loss tally over the in-scope games. */
  results: { win: number; loss: number; draw: number };
  /** Set when nothing matched, so the caller can tell the Player why. */
  message?: string;
}

/**
 * An Import's summary: the figures **consolidated over the whole range**, plus
 * one line per month for traceability. The rich aggregates are deliberately not
 * repeated per month — a 12 x 9 table of numbers is not a summary (ADR-0010).
 */
export interface ImportResult extends ImportFigures {
  months: MonthlyImport[];
}

/**
 * The month stopped being a unit of *fetching* here too. There is no
 * `importMonth` any more: the Import asks the port for a range and folds the
 * event stream (see ./range.ts). What lives in this file is the **shapes** an
 * Import reports in, and the empty tally they start from.
 */
