import type { ClockPrecision } from "../types";

/**
 * How a measured time is **said** on screen (US-15b).
 *
 * The precision is a property of the material, never a display preference
 * (ADR-0029): chess.com's PGN writes tenths (`0:01:00.8`), Lichess's rounds to
 * the nearest second. A `Time spent` is a **difference of two readings**, so it
 * is good to ±0.2 s on one Platform and ±1 s on the other — and a column that
 * printed `1,0 s` on a Lichess Game would assert a tenth the material never
 * carried. The column tells the truth about its own precision, or the Player
 * learns to distrust every figure in it.
 *
 * `null` in, `null` out — and the caller says the absence **in words**. Never a
 * `0`: a future aggregate that averaged a fabricated zero would be wrong in a
 * way nobody could see.
 */
export function formatDuration(
  centiseconds: number | null,
  precision: ClockPrecision | null,
): string | null {
  if (centiseconds === null || precision === null) return null;
  const seconds = centiseconds / 100;
  if (seconds < 60) return `${decimal(seconds, precision)} s`;
  // Past a minute nobody reads `93,4 s`. The seconds keep their precision.
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${decimal(seconds % 60, precision)} s`;
}

/**
 * A remaining `Clock`, said the same way — one function apart from
 * `formatDuration` only because the two answer different questions and a caller
 * should have to name which it is asking.
 *
 * `0` is printed here, and is the one legitimate zero in this feature: a side
 * whose flag fell genuinely had no time left. That is a measurement, not a gap.
 */
export function formatClock(
  centiseconds: number | null,
  precision: ClockPrecision | null,
): string | null {
  return formatDuration(centiseconds, precision);
}

/** A figure at the precision the source actually carries — a tenth where there
 *  is one, a whole second where there is not, and the French decimal comma. */
function decimal(seconds: number, precision: ClockPrecision): string {
  if (precision === "seconds") return String(Math.round(seconds));
  return seconds.toFixed(1).replace(".", ",");
}
