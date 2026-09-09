/**
 * One half-move's annotation (US-7), as served by `GET /api/games/:id/annotations`:
 * the White-relative `Evaluation`/win-chances for the resulting Position, and —
 * for the Player's own Moves only — the severity that led to it.
 */
export interface MoveAnnotation {
  ply: number;
  whiteEval: { cp: number | null; mate: number | null };
  whiteWinChances: number;
  severity: "inaccuracy" | "mistake" | "blunder" | null;
  /**
   * The `Best line` from **this** Position, in UCI, as the engine printed it —
   * whole (the ~6-ply cap is this client's own display choice, applied where the
   * line is read). One field, two readings: the line at ply `n` is what should
   * have been played there, and the line at ply `n + 1` is how the Move actually
   * played is punished.
   */
  bestLine: string[];
  /**
   * The `Phase` this Move was played in (CONTEXT.md) — **derived** server-side
   * from the Position stored with the `Evaluation`, in the Game's own sequence
   * (it latches). A heuristic, and shown precisely so the Player can disagree
   * with where the boundary fell in a Game of theirs.
   */
  phase: "early" | "middlegame" | "endgame";
  /**
   * Whether this Move counts in the analysis and, when it does not, which of the
   * two reasons applies (CONTEXT.md `Counted Move`). `null` for ply 0 and for the
   * **opponent's** Moves — nothing is derived for them, which is a different
   * claim from "not counted".
   */
  counted: { counted: boolean; reason: "forced" | "decided" | null } | null;
  /**
   * What this Move cost the Player, in winning-chances points (ADR-0017).
   * `null` where nothing is contributed (ply 0, the opponent's Moves), `0` for a
   * Move that does not count. The Game's recap is the **sum** of these, which is
   * what stops the cumulative trace and the total stated beside it disagreeing.
   */
  chancesLost: number | null;
}

/** The `Search regime` a Game was analyzed under (CONTEXT.md): depth and number
 *  of lines. What says how much confidence its figures deserve. */
export interface SearchRegime {
  depth: number;
  lines: number;
}

/**
 * What a Game **contributes** to the analysis (ADR-0017): the aggregate to come
 * is this recap summed, so the page reads the same derivation the corpus will —
 * never a second summary of its own making.
 */
export interface GameRecap {
  playerMoves: number;
  countedMoves: number;
  excluded: { forced: number; decided: number };
  /** Flawed Moves the **Game** shows, counted or not. */
  flaggedMoves: number;
  /** Flawed Moves the **analysis** holds the Player to. */
  countedErrors: number;
  /**
   * The gap between the two above, **by the reason that excluded each Move** —
   * the server's own breakdown, never recomputed here. A lump would let this
   * screen say "shown but not counted" and stop: the two reasons say different
   * things, and the Player has to be able to tell them apart.
   */
  flaggedUncounted: { forced: number; decided: number };
  chancesLost: number;
  flaggedLoss: number;
  /** The residual: `flaggedLoss + drift === chancesLost`, on every Game. */
  drift: number;
  regime: SearchRegime | null;
}

/**
 * The exact clock setting a Game was played under (CONTEXT.md, `Time control`),
 * as the server derives it from the PGN (ADR-0029). Two shapes, because a
 * real-time budget and a correspondence allowance are not the same kind of fact
 * — folding them into one would invite subtracting days from seconds.
 *
 * Centiseconds, like every measured time here: the finest unit the material
 * carries, and an integer that cannot drift over a sum.
 */
export type TimeControl =
  | { kind: "realtime"; initialCs: number; incrementCs: number }
  | { kind: "correspondence"; daysPerMove: number };

/**
 * What a Game says about **time** (US-15b) — served beside the annotations and
 * deliberately outside `recap`, because it is read from the PGN and therefore
 * exists on a Game the engine has never seen. `rapid` has no analysed Game at
 * all, and it is the cadence this story exists for.
 */
export interface GameTime {
  /** The exact clock setting, or `null` when the PGN declares none. */
  timeControl: TimeControl | null;
  /** Every half-move's time; index 0 is the starting Position, which no side
   *  has played to and which therefore carries neither figure. */
  plies: PlyTime[];
  /** `null` when Clocks are recorded; otherwise **why** they are not. */
  absence: NoClockReason | null;
  /** The precision the source carries; `null` when no Clock is recorded. */
  precision: ClockPrecision | null;
  /** The Game's own reading of the time; `null` when it has no Clock to read. */
  reading: TimeReading | null;
}

/** One of the Player's Moves, named by its ply and what it cost — in seconds,
 *  and as a share of what that side held before playing it. */
export interface LongMove {
  ply: number;
  spentCs: number;
  shareOfRemaining: number | null;
}

/**
 * What the whole Game says about the Player's time (US-15b).
 *
 * **Every figure is a fold over `GameTime.plies`**, never a parallel
 * calculation (ADR-0017) — the Player must be able to recoup the panel against
 * the column by hand, and a figure that could only be believed is the thing this
 * app refuses. No threshold, no ranking, no "what to work on": those are US-15c
 * and US-15d.
 */
export interface TimeReading {
  moves: number;
  totalSpentCs: number;
  /** The mark "a low clock" was counted against — **stated**, so the Player can
   *  count the same Moves. A tenth of the initial budget: a scale tied to the
   *  cadence, not a number chosen on paper for every Game alike. */
  lowClockCs: number;
  underLowClock: number;
  /** The Player's longest Moves in **seconds**, longest first. */
  longest: LongMove[];
  /**
   * The Player's costliest Moves as a **share** of what was left, biggest first.
   * A different list from `longest`, on purpose: seconds alone hide every
   * late-Game panic, and share alone hides the long think that caused it.
   */
  costliestShare: LongMove[];
  /** The cadence this reading is read **within** — carried so it can never be
   *  compared across two `Time control category`s. */
  timeControl: TimeControl;
  /** How many of `moves` actually carry a figure. Equal to `moves` on a Game
   *  whose clocks are complete; when it is not, the total is over these and the
   *  panel says so rather than counting an absence as a zero. */
  measuredMoves: number;
  /** What the side to move had left when the Game ended **without them playing**
   *  (resignation, agreement, abandonment) — a fact about the Game, belonging to
   *  no Move. `null` on a mate and on every chess.com Game: read as *sans
   *  objet*, never as a gap. */
  lastClockCs: number | null;
}

/**
 * How precise a Game's `Clock` readings are — a property of the material
 * (ADR-0029). chess.com writes tenths, Lichess rounds to the second, so a
 * decimal is printed only where one is real.
 */
export type ClockPrecision = "tenths" | "seconds";

/**
 * Why a Game carries no `Clock`. **Two different facts, deliberately kept
 * apart**: `not-applicable` is a `correspondence` Game, which has no clock to
 * have and reads "sans objet"; `not-recorded` is a real-time Game whose PGN
 * carries none, which is a gap in what we hold. Said as one, a future aggregate
 * would average an absence that is a fact together with one that is missing data.
 */
export type NoClockReason = "not-applicable" | "not-recorded";

/** One half-move's time. */
export interface PlyTime {
  ply: number;
  /** What the side had left after playing it; `null` when unknown. */
  clockCs: number | null;
  /** How long it took — **derived**, never stored. `null` where it cannot be
   *  derived, and never `0`. */
  spentCs: number | null;
  /**
   * What share of the clock this Move cost, 0–100, measured against what the side
   * had **before playing it**. The figure that tells two identical `Time spent`s
   * apart: 12 s is a shrug on a full clock and a catastrophe on 20 s left.
   * `null` wherever the `Time spent` is unknown — never `0`.
   */
  shareOfRemaining: number | null;
}

/** `GET /api/games/:id/annotations` response: `plies` is empty when `analyzed` is `false`. */
export interface GameAnnotations {
  analyzed: boolean;
  plies: MoveAnnotation[];
  /** The regime the Game was analyzed under; `null` when unanalyzed or unknown. */
  regime: SearchRegime | null;
  /** What this Game contributes; `null` when it has not been analyzed. */
  recap: GameRecap | null;
  /** What this Game says about time — filled whatever `analyzed` says. */
  time: GameTime;
}
