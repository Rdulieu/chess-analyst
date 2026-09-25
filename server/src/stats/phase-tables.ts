import { PHASES, type Phase } from "../analysis/phase";
import { bucket, type Bucket } from "../results/win-rate";

/**
 * Where one Game **ended**: the `Phase` of its last half-move, and its result.
 *
 * `null` when we could not replay the PGN at all — counted apart, never filed
 * under a Phase. Same refusal the configuration table makes one block up: "your
 * Game ended in the Middlegame" is a statement about the Player's chess, "we
 * could not read it" is a statement about us, and printing the second as the
 * first is the one thing these tables are built not to do.
 */
export interface PhaseEnding {
  phase: Phase | null;
  result: "win" | "draw" | "loss";
}

/** One Phase's line of table A: the results of the Games that ended there. */
export interface PhaseResultRow extends Bucket {
  phase: Phase;
  /**
   * Its share of the filed Games, as a **whole percent**, and the three add up
   * to exactly 100 — see `wholeShares`. A fraction would leave the page to
   * round, and rounding three fractions on their own prints 99.
   */
  share: number;
}

/**
 * **Where the Player's Games are decided** (US-32) — a Game per row-Phase, the
 * Phase it *ended* in.
 *
 * Read it against the configuration table just above, which it touches on
 * screen and contradicts in structure: there a Game sits on as many rows as it
 * crossed configurations and the column adds up to nothing; here a Game ends in
 * one Phase and one only, so **the shares make 100 %**. Two tables whose columns
 * mean opposite things must each say which, and both do.
 *
 * The currency is the Game's **result**, and the `Phase` axis is derived from
 * the PGN alone — so this table covers the whole history and costs **no engine
 * time**. That is the difference with table B and it is stated on the screen.
 *
 * **It shows a correlation and must not be read as a cause.** A Game that ended
 * in the Endgame was not *lost by* the Endgame; it was a Game that nothing
 * decided earlier. The page says so in words (ADR-0036's amendment, condition 2).
 */
export interface PhaseResultTable {
  rows: PhaseResultRow[];
  /** Every Game of the `Profile` — the table's outer denominator. */
  games: number;
  /** Those actually filed under a Phase: `games` less the unreadable ones. */
  filed: number;
  /** PGNs we failed to replay: counted, named, and in no row. */
  unreadable: number;
}

/** Folds one `Profile`'s Games into table A. */
export function phaseResultTable(endings: PhaseEnding[]): PhaseResultTable {
  const filed = endings.filter((e) => e.phase !== null);
  const buckets = PHASES.map((phase) => bucket(filed.filter((e) => e.phase === phase)));
  const shares = wholeShares(buckets.map((b) => b.games));

  return {
    rows: PHASES.map((phase, i) => ({ phase, ...buckets[i], share: shares[i] })),
    games: endings.length,
    filed: filed.length,
    unreadable: endings.length - filed.length,
  };
}

/**
 * Counts as whole percents that **sum to exactly 100** — largest remainder, the
 * same doctrine the per-Game damage table settles its tenths by.
 *
 * It is not cosmetic here: the table's own claim is that a Game ends in one
 * Phase and one only, so its column *is* the whole. 6 / 36 / 144 of 186 rounds
 * to 3 + 19 + 77 = 99 line by line, and a table that prints 99 under a sentence
 * promising 100 refutes itself at a glance.
 *
 * All zeroes in, all zeroes out: nothing to share is not a hundred percent of
 * nothing.
 */
function wholeShares(counts: number[]): number[] {
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (total === 0) return counts.map(() => 0);

  const exact = counts.map((n) => (n / total) * 100);
  const floors = exact.map(Math.floor);
  let owed = 100 - floors.reduce((sum, n) => sum + n, 0);
  const order = counts
    .map((_, i) => i)
    .sort((a, b) => exact[b] - floors[b] - (exact[a] - floors[a]) || a - b);
  for (const i of order) {
    if (owed === 0) break;
    floors[i] += 1;
    owed -= 1;
  }
  return floors;
}

/**
 * What one **analysed** Game contributes to table B: the winning chances it lost
 * in each `Phase`, and over the Game.
 *
 * `null` for a Phase the Game **never reached** — never a zero. A Game that
 * ended in the Middlegame has no Endgame to be good or bad at, and counting it
 * as "0 % of its damage in the Endgame" would print a false strength and drag
 * every Endgame average down with Games that never played one.
 */
export interface GameDamage {
  byPhase: Record<Phase, number | null>;
  chancesLost: number;
}

/** One Phase's line of table B. Two independent readings, side by side. */
export interface PhaseDamageRow {
  phase: Phase;
  /**
   * Games whose damage is **heaviest** here — the robust measure, and the
   * reason this table exists at all (ADR-0036's amendment, condition 3). A count
   * of Games cannot be carried away by one catastrophe the way a pooled sum can.
   */
  dominant: number;
  /**
   * Games that **reached** this Phase: this row's own denominator, and not the
   * one the row above it uses. The shares below are read over these Games only.
   */
  reached: number;
  /** The mean share of a Game's damage falling here, over `reached`. */
  meanShare: number | null;
  /**
   * Its **median**, and the mean never travels without it (condition 3). On the
   * requester's base the Endgame means 22,8 % and medians 11,9 %: the gap *is*
   * the dissymmetry, and showing both beats choosing one.
   */
  medianShare: number | null;
}

/**
 * **Where the Player's damage falls** (US-32, ADR-0036's amendment).
 *
 * The amendment restricts, and does not repeal, "the corpus speaks in results":
 * what made a corpus-wide damage reading hollow was never the scale, it was the
 * **cardinality**. The same Games that scatter over 808 `Material signature`s —
 * eight for the best-served — fall into **three** Phases. So this axis, and this
 * axis only, carries both currencies, in **two tables, never one**: no
 * composite, no shared column, no common ranking.
 *
 * Three things it refuses:
 *
 * - **No pooled sum.** Adding the whole corpus's chances lost lets the disaster
 *   Games decide. Hence a count of Games, and a mean **with** its median.
 * - **No borrowed denominator.** It reads the **analysed** Games only, and says
 *   so beside table A's figure — two denominators on one screen are a confusion
 *   unless they are written.
 * - **No zero for a Phase never reached** — the same discipline one scale down.
 *
 * And it ages backwards: every engine pass **improves** it and moves its
 * denominator under the reader. It therefore announces a count and never "your
 * Games".
 */
export interface PhaseDamageTable {
  rows: PhaseDamageRow[];
  /** Analysed Games — the denominator of `dominant`, announced in words. */
  analysed: number;
  /** All the `Profile`'s Games, so the gap with table A is on the screen. */
  games: number;
  /** Analysed Games that lost nothing at all: no dominant Phase, and said. */
  undamaged: number;
}

/** Folds the analysed Games' recaps into table B. `games` is table A's total. */
export function phaseDamageTable(readings: GameDamage[], games: number): PhaseDamageTable {
  const shares: Record<Phase, number[]> = { early: [], middlegame: [], endgame: [] };
  const dominant: Record<Phase, number> = { early: 0, middlegame: 0, endgame: 0 };
  let undamaged = 0;

  for (const reading of readings) {
    for (const phase of PHASES) {
      const lost = reading.byPhase[phase];
      // A Phase reached and crossed cleanly still counts, at a share of zero:
      // the absence this table refuses is "never reached", not "cost nothing".
      if (lost !== null) shares[phase].push(reading.chancesLost === 0 ? 0 : lost / reading.chancesLost);
    }
    if (reading.chancesLost === 0) {
      undamaged += 1;
      continue;
    }
    // Ties go to the earliest Phase, which is the order the Game itself has.
    // Arbitrary, and therefore written down rather than left to sort stability.
    const heaviest = PHASES.filter((p) => reading.byPhase[p] !== null).reduce((best, p) =>
      (reading.byPhase[p] as number) > (reading.byPhase[best] as number) ? p : best,
    );
    dominant[heaviest] += 1;
  }

  return {
    rows: PHASES.map((phase) => ({
      phase,
      dominant: dominant[phase],
      reached: shares[phase].length,
      meanShare: mean(shares[phase]),
      medianShare: median(shares[phase]),
    })),
    analysed: readings.length,
    games,
    undamaged,
  };
}

/** `null` on nothing: an average of no Games is not zero, it is unsaid. */
function mean(values: number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** The middle value, or the midpoint of the two middles. `null` on nothing. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
