import { loadGame } from "../chess/positions";

/**
 * The `Time control` (CONTEXT.md): the exact clock setting a Game was played
 * under. Two shapes, because the two are not the same kind of fact — a
 * real-time budget is a stopwatch, a correspondence allowance is a deadline per
 * Move — and folding them into one would invite a caller to subtract days from
 * seconds.
 *
 * Centiseconds, as everything measured here is (ADR-0029): Lichess's own unit,
 * the finest the material carries, and an integer that cannot drift the way a
 * float of seconds does over a sum.
 */
export type TimeControl =
  | { kind: "realtime"; initialCs: number; incrementCs: number }
  | { kind: "correspondence"; daysPerMove: number };

/** Seconds in a day — the unit chess.com's `1/86400` counts days in. */
const SECONDS_PER_DAY = 86_400;

/** `180+2` or a bare `300`: a budget in seconds, and an increment that is zero
 *  when unwritten rather than unknown. */
const REALTIME = /^(\d+)(?:\+(\d+))?$/;
/** chess.com's correspondence spelling: one Move per N seconds. */
const CHESSCOM_DAILY = /^1\/(\d+)$/;
/** Lichess's, in words — singular on one day, plural beyond. */
const LICHESS_DAILY = /^(\d+) days? per move$/;

/**
 * The `Time control` a Game's PGN declares, or `null` when it declares none.
 *
 * **This is the one named translation** the four spellings of the two Platforms
 * pass through (ADR-0029, in deliberate tension with ADR-0018): chess.com sends
 * `300`, `180+2` and `1/86400`; Lichess sends `300+0`, `600+5` and
 * `2 days per move`. Every entry point calls this — a fifth spelling is added
 * here or nowhere, and no caller re-derives a partial version of it.
 *
 * Absence is answered as absence. A PGN with no `[TimeControl]`, PGN's own `-`
 * for "no time control", and a spelling neither Platform has ever sent all give
 * `null` — never a zero, which would read as "no time at all" and would average
 * into a future aggregate as a real measurement.
 */
export function timeControlOf(pgn: string): TimeControl | null {
  const declared = loadGame(pgn).header().TimeControl?.trim();
  if (!declared) return null;

  const realtime = REALTIME.exec(declared);
  if (realtime) {
    return {
      kind: "realtime",
      initialCs: Number(realtime[1]) * 100,
      // Unwritten is zero: `300` is a Game with no increment, which is a
      // setting, not a gap in what the Platform told us.
      incrementCs: Number(realtime[2] ?? 0) * 100,
    };
  }

  const daily = CHESSCOM_DAILY.exec(declared);
  // The seconds are counted back into days rather than matched against a table
  // of known values: `1/259200` is three days, and a table would have to grow a
  // row for every allowance a Player happens to pick.
  if (daily) return { kind: "correspondence", daysPerMove: Number(daily[1]) / SECONDS_PER_DAY };

  const words = LICHESS_DAILY.exec(declared);
  if (words) return { kind: "correspondence", daysPerMove: Number(words[1]) };

  return null;
}

/**
 * What a Game says about time, as every read path receives it (US-15b).
 *
 * Read from the PGN, so it exists on a Game the engine has never seen — which
 * is why it is a block of its own rather than part of `GameRecap` (ADR-0017's
 * recap is about the *analysis*, and is `null` without one).
 */
export interface GameTime {
  /** The exact clock setting, or `null` when the PGN declares none. */
  timeControl: TimeControl | null;
}

/** Everything a Game's PGN says about time. One entry point, so no caller
 *  assembles the block itself and no two callers assemble it differently. */
export function gameTime(pgn: string): GameTime {
  return { timeControl: timeControlOf(pgn) };
}
