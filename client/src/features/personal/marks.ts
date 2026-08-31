import type { PersonalAnalysis, PersonalMark } from "../../types";

/**
 * What the Player has said about one ply **in one layer**. The layer is explicit
 * at every call: before the seal there is only the initial one, after it the
 * controls act on the posterior one while the initial stays readable beside them.
 * A `markAt` that guessed would be the bug that quietly overwrites a sealed
 * reading.
 *
 * **One copy, on purpose.** The panel's extraction (US-22 slice 05) duplicated it
 * verbatim, comment and all, into two files that could then disagree — about the
 * one question this function exists to refuse to guess.
 */
export function markAt(
  reading: PersonalAnalysis,
  ply: number,
  posterior: boolean,
): PersonalMark | undefined {
  return reading.marks.find((m) => m.ply === ply && m.posterior === posterior);
}
