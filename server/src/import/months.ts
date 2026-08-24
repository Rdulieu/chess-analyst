import { monthOrdinal as ordinal, monthsInRange } from "../platform/months";
import type { MonthRef } from "../platform/types";

// `MonthRef` and the month arithmetic now live beside the PORT: the adapters walk
// months too (chess.com issues one request each, Lichess slices one stream back
// into them). What stays here is the Import's own POLICY about a range.
export type { MonthRef };
export { monthsInRange };

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
