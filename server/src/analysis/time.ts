import type { Game } from "../db/schema";
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
  //
  // A divisor that is **not** a whole number of days is answered `null` rather
  // than as a fraction. `1/43200` would otherwise give `0.5`, which renders as
  // "0.5 jour par coup" — a decimal point where this app writes a comma, and a
  // plural that reads the wrong way round. Saying nothing is honest; saying
  // that is not.
  if (daily) {
    const days = Number(daily[1]) / SECONDS_PER_DAY;
    return Number.isInteger(days) ? { kind: "correspondence", daysPerMove: days } : null;
  }

  const words = LICHESS_DAILY.exec(declared);
  if (words) return { kind: "correspondence", daysPerMove: Number(words[1]) };

  return null;
}

/**
 * How precise a Game's `Clock` readings actually are — a property of the
 * material, not a display preference (ADR-0029).
 *
 * chess.com's PGN writes tenths (`0:01:00.8`); Lichess's rounds to the nearest
 * second (180.03 → `0:03:00`, 66.75 → `0:01:07`). So a `Time spent` — a
 * difference of two readings — is good to ±0.2 s on one Platform and ±1 s on
 * the other. The screen prints a decimal only where one is real: the column has
 * to tell the truth about its own precision, or the Player learns to distrust
 * every figure in it.
 */
export type ClockPrecision = "tenths" | "seconds";

/**
 * Why a Game carries no `Clock`. **These are two different facts and melting
 * them would be the story's central mistake:**
 *
 * - `not-applicable` — a `correspondence` Game. There is no clock to have; the
 *   Platform never had one. It reads "sans objet".
 * - `not-recorded` — a real-time Game whose PGN carries no `[%clk]`. The clock
 *   existed and we do not hold it. Every one of the 434 Lichess Games in the
 *   corpus is in this state until the refresh of slice 05, because the export
 *   was never asked for `clocks=true`.
 *
 * Said as one, "pas d'horloge" would mean both, and a future aggregate would
 * average an absence that is a fact together with one that is a gap.
 *
 * This absence deliberately does **not** travel through `UncountedReason`, which
 * holds two values by decision (ADR-0023) and serves the `Counted Move`
 * denominator. The clock declares its own holes.
 */
export type NoClockReason = "not-applicable" | "not-recorded";

/** One half-move's time. Ply-indexed like every other per-Move array here:
 *  index 0 is the starting Position, which no side has played to. */
export interface PlyTime {
  ply: number;
  /** What the side had left after playing this half-move; `null` when unknown. */
  clockCs: number | null;
  /** How long this half-move took, **derived** and never stored (ADR-0009):
   *  the same side's previous `Clock` minus this one, plus the increment — and
   *  for a side's first Move, `initial + increment − Clock`. `null` where it
   *  cannot be derived, never `0`. */
  spentCs: number | null;
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
  /** Every half-move's time, index 0 being the starting Position. */
  plies: PlyTime[];
  /** `null` when Clocks are recorded; otherwise **why** they are not. */
  absence: NoClockReason | null;
  /** The precision the source carries; `null` when no Clock is recorded. */
  precision: ClockPrecision | null;
  /** The Game's own reading of the time; `null` when it has no Clock to read. */
  reading: TimeReading | null;
}

/** One of the Player's Moves, named by its ply and how long it took. */
export interface LongMove {
  ply: number;
  spentCs: number;
}

/**
 * What the whole Game says about the Player's time (US-15b, slice 03) — so the
 * Player gets a readable verdict without counting thirty lines themselves.
 *
 * **Every figure here is a fold over `GameTime.plies`, never a parallel walk of
 * the PGN.** That is ADR-0017's discipline: two implementations of one method
 * agree only by luck, and the EPIC requires the Player be able to recoup the
 * panel against the column **by hand**. A figure that could not be checked that
 * way would have to be believed instead, which is the thing this app refuses.
 *
 * The Player's Moves only, like the rest of the recap.
 *
 * **No severity threshold, no ranking, no "what to work on".** Those are US-15c
 * and US-15d, and ADR-0023 records what choosing a threshold on paper costs.
 * What this owes 15c is a number per Move and a rule for the denominator.
 */
export interface TimeReading {
  /** How many Moves the Player played — the denominator of everything here. */
  moves: number;
  /**
   * How many of those Moves actually **carry** a `Time spent`. Equal to `moves`
   * on a Game whose clocks are complete, which is the ordinary case.
   *
   * It exists because the alternative is a fake zero. Folding an underivable
   * Move into the total as `0` would let `totalSpentCs` exclude Moves that
   * `moves` still counts, with nothing on screen naming the gap — and a `0` the
   * app never measured is precisely what a future aggregate would average
   * (SPEC US-18). When the two differ, the panel says the total is over the
   * measured Moves rather than over all of them.
   */
  measuredMoves: number;
  /** Everything the Player spent, the sum of the column's own figures — over
   *  `measuredMoves`, never with an absence counted as zero. */
  totalSpentCs: number;
  /**
   * The mark "a low clock" is counted against, **stated** rather than hidden, so
   * the Player can count the same Moves themselves. Derived from the cadence
   * (a tenth of the initial budget), because a second in bullet and a second in
   * classical are not the same second.
   *
   * It is a **scale**, not a severity threshold: it says what counts as little
   * time on THIS cadence, and it classifies nothing.
   */
  lowClockCs: number;
  /** How many of the Player's Moves were played under that mark. */
  underLowClock: number;
  /** The Player's longest Moves, longest first. */
  longest: LongMove[];
  /**
   * The cadence this reading is to be read **within** — carried, so the reading
   * can never be compared across two `Time control category`s. The rule that
   * already governs `Weak opening`, and the reason the category exists.
   */
  timeControl: TimeControl;
  /**
   * What the side to move had left when the Game ended **without them playing**
   * — a resignation, an agreed draw, an abandonment (CONTEXT.md, `Clock`).
   *
   * It belongs to no `Move`, so it has no place in the column and is stated
   * here instead: it is a fact about the **Game**. It is also the one clock
   * value that is stored rather than derived (ADR-0029's single exception).
   * `null` — read as *sans objet*, never as a gap — on every **mate**, where the
   * last Move ends the Game and there is nobody left to read, and on every
   * chess.com Game, that Platform exposing no equivalent.
   */
  lastClockCs: number | null;
}

/** How many of the Player's longest Moves the reading names. Enough to show a
 *  pattern, few enough to stay a reading rather than a second column. */
const LONGEST_SHOWN = 3;

/** What counts as a low clock, as a fraction of the initial budget — a tenth:
 *  6 s on a 60 s bullet Game, 30 s on a 5-minute blitz one. A SCALE tied to the
 *  cadence, never a number chosen on paper for every Game alike. */
const LOW_CLOCK_FRACTION = 10;

/** `[%clk 0:03:00.8]` — the token, wherever it sits in the comment. A Lichess
 *  comment holds several (`"[%eval 0.18] [%clk 0:03:00]"`), so this matches the
 *  token rather than the whole string (ADR-0029). */
const CLOCK_TOKEN = /\[%clk\s+(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)\s*\]/;

/** One `[%clk]` reading in centiseconds, or `null` when the comment holds none. */
function clockIn(comment: string | undefined): number | null {
  if (comment === undefined) return null;
  const found = CLOCK_TOKEN.exec(comment);
  if (found === null) return null;
  const [, hours, minutes, seconds] = found;
  // Rounded, not truncated: the seconds field carries at most a tenth, and
  // floating-point multiplication of `0.8` does not land on an integer.
  return Math.round((Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * 100);
}

/** Whether any reading carries a fraction of a second — which is what says the
 *  source writes tenths rather than whole seconds. */
function precisionOf(comments: (string | undefined)[]): ClockPrecision {
  const tenths = comments.some((comment) => {
    const found = comment === undefined ? null : CLOCK_TOKEN.exec(comment);
    return found !== null && found[3].includes(".");
  });
  return tenths ? "tenths" : "seconds";
}

/**
 * Everything a Game's PGN says about time. **One entry point**, so no caller
 * assembles the block itself and no two callers assemble it differently — and
 * the per-Game reading of slice 03 is a fold over exactly these numbers rather
 * than a second pass over the PGN (ADR-0017: two implementations of one method
 * agree only by luck).
 */
export function gameTime(
  pgn: string,
  playerColor: Game["playerColor"],
  /** The stored last `Clock` — the one reading no `Move` owns. It is a column
   *  rather than something the PGN carries (ADR-0029's single exception), so it
   *  is handed in rather than derived here. */
  lastClockCs: Game["lastClockCs"] = null,
): GameTime {
  const timeControl = timeControlOf(pgn);
  const history = loadGame(pgn).history();
  const comments = history.map((move) => move.commentAfter);

  // A correspondence Game HAS a Time control and has no Clock — the Platform
  // exposes none, and the `[%clk]` chess.com does write on its `daily` Games is
  // non-monotone and outside any 24 h budget, i.e. interpretable as nothing.
  // Measured 2026-09-08; reading it would fabricate a pressure nobody was under.
  const daily = timeControl?.kind === "correspondence";
  const readings = daily ? [] : comments.map(clockIn);
  const recorded = readings.some((reading) => reading !== null);
  const precision = precisionOf(comments);

  const plies: PlyTime[] = [
    // Ply 0 is the starting Position: no side has played to it, so it carries
    // no Clock and no Time spent. Stated, not omitted, so the array stays
    // index-aligned with every other per-Move array the payload serves.
    { ply: 0, clockCs: null, spentCs: null },
    ...readings.map((clockCs, index) => ({
      ply: index + 1,
      clockCs,
      spentCs: spentAt(readings, index, timeControl, precision),
    })),
  ];

  return {
    timeControl,
    plies,
    absence: recorded ? null : daily ? "not-applicable" : "not-recorded",
    precision: recorded ? precision : null,
    // Folded from the very array above — the panel and the column cannot
    // disagree, because there is only one set of numbers (ADR-0017).
    reading: recorded ? readingOf(plies, playerColor, timeControl, lastClockCs) : null,
  };
}

/** Whether the half-move at this ply was played by the Player. Ply 1 is White's
 *  first, so odd plies are White's. */
function isPlayers(ply: number, playerColor: Game["playerColor"]): boolean {
  return ply > 0 && (ply % 2 === 1) === (playerColor === "white");
}

/**
 * The Game's reading, folded over the Moves' own figures.
 *
 * `null` when there is no real-time cadence to read it within: without one there
 * is no scale for "a low clock", and inventing one would be exactly the
 * paper-chosen threshold this story refuses.
 */
function readingOf(
  plies: PlyTime[],
  playerColor: Game["playerColor"],
  timeControl: TimeControl | null,
  lastClockCs: number | null,
): TimeReading | null {
  if (timeControl === null || timeControl.kind !== "realtime") return null;
  const mine = plies.filter((ply) => isPlayers(ply.ply, playerColor));
  const lowClockCs = Math.round(timeControl.initialCs / LOW_CLOCK_FRACTION);
  // The Moves that actually carry a figure. Summed with `?? 0` instead, an
  // absence would enter the total as a measurement of zero — the one thing this
  // whole feature refuses (SPEC US-18).
  const measured = mine.filter((ply): ply is PlyTime & { spentCs: number } => ply.spentCs !== null);

  return {
    moves: mine.length,
    measuredMoves: measured.length,
    totalSpentCs: measured.reduce((total, ply) => total + ply.spentCs, 0),
    lowClockCs,
    underLowClock: mine.filter((ply) => ply.clockCs !== null && ply.clockCs < lowClockCs).length,
    longest: [...measured]
      .sort((a, b) => b.spentCs - a.spentCs)
      .slice(0, LONGEST_SHOWN)
      .map((ply) => ({ ply: ply.ply, spentCs: ply.spentCs })),
    timeControl,
    lastClockCs,
  };
}

/**
 * How long the half-move at `index` (0-based over the Moves) took.
 *
 * A side's clock is compared with **its own** previous reading, two plies back —
 * never with the opponent's — and the increment it was granted for playing is
 * added back, otherwise every Move on an incremented cadence reads as faster
 * than it was, and a Move that gained time reads as negative.
 *
 * A side's **first** Move has no previous reading, so the cadence supplies it:
 * `initial + increment − Clock`. That is what stops line 1 being a hole.
 *
 * `null` — never `0` — wherever the difference cannot be taken: no Clock here,
 * none to compare against, or no Time control to name the increment.
 */
function spentAt(
  readings: (number | null)[],
  index: number,
  timeControl: TimeControl | null,
  precision: ClockPrecision,
): number | null {
  const clock = readings[index];
  if (clock === null || clock === undefined) return null;
  // Only a real-time cadence carries an increment and an initial budget; without
  // one there is no honest difference to state.
  if (timeControl === null || timeControl.kind !== "realtime") return null;

  const previous = index >= 2 ? readings[index - 2] : undefined;
  const spent =
    previous === null || previous === undefined
      ? // A side's first Move, measured against the budget it started from.
        timeControl.initialCs + timeControl.incrementCs - clock
      : previous + timeControl.incrementCs - clock;

  if (spent >= 0) return spent;
  // A Move cannot take less than no time, and what a negative MEANS depends on
  // the material — so the two are not treated alike.
  //
  // At whole-second precision the difference is only good to ±1 s (Lichess
  // rounds; ADR-0029), so a small negative is an artefact of that rounding and
  // the honest reading is "about none": floored, because the Move WAS played.
  // At tenth precision the source is exact enough that a negative cannot be
  // rounding — it is an inconsistency in the data, and flooring it would
  // silently pass a fabricated zero to a future aggregate. That one is answered
  // `null`: no figure, said as no figure.
  return precision === "seconds" ? 0 : null;
}
