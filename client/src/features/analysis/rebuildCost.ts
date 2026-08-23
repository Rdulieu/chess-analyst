/**
 * Roughly how long the engine takes per Position under the current `Search
 * regime` (depth 16, MultiPV 2 — ADR-0016). Measured loosely on real runs during
 * US-15a: 48 Positions went by in well under a minute, 170 took a few.
 *
 * Deliberately a single constant with its provenance in the comment rather than
 * a model: the figure exists to tell a Player whether they are about to spend
 * seconds or an afternoon, and a false precision would be worse than a round
 * number. If the regime changes, this is the one line to change.
 */
const SECONDS_PER_POSITION = 1;

/**
 * The order of magnitude, **in minutes**, of rebuilding a Game's analysis — what
 * the confirmation quotes before overwriting `Evaluation`s that only engine time
 * can produce again (ADR-0015).
 *
 * Rounded up and never below one: "0 minutes" would read as "instant", and no
 * engine run is.
 */
export function rebuildMinutes(positions: number): number {
  return Math.max(1, Math.round((positions * SECONDS_PER_POSITION) / 60));
}
