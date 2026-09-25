import type { Phase } from "../chess/phase";
import type { TimeControlCategory } from "./game";

/** Player-relative results over a set of Games. `winRate` is null when games = 0. */
export interface StatsBucket {
  games: number;
  win: number;
  draw: number;
  loss: number;
  winRate: number | null;
}

/**
 * The results summary as served by `GET /api/stats` — and **only** that
 * (US-32 slice 08). The three tables that used to travel with it now come from
 * their own routes, split by what they cost: this one is three folds over rows
 * already in hand, so it answers in milliseconds and the page paints on it.
 */
export interface StatsSummary {
  total: StatsBucket;
  byCategory: Record<TimeControlCategory, StatsBucket>;
  bySide: Record<"white" | "black", StatsBucket>;
}

/**
 * What `GET /api/stats/replay` serves: the three tables **one** PGN replay
 * feeds. They travel together because they share that replay — asking for them
 * separately would replay every PGN three times (slice 06's decision, kept).
 */
export interface StatsReplay {
  signatures: SignatureTable;
  /** The win rate by band of material disagreement (US-32 slice 07). */
  materialBands: MaterialBandTable;
  /** Where the Games are decided, in results, over the whole history (US-32). */
  phaseResults: PhaseResultTable;
}

/**
 * What `GET /api/stats/recaps` serves: the damage table, folded from stored
 * `Evaluation`s and needing no PGN replay — which is why it is its own request
 * rather than something queued behind one.
 */
export interface StatsDamage {
  /** Where the damage falls, over the analysed Games only (ADR-0036 amended). */
  phaseDamage: PhaseDamageTable;
}

/** One `Phase`'s line of the results table: the Games that ENDED there. */
export interface PhaseResultRow extends StatsBucket {
  phase: Phase;
  /** Its share of the filed Games, as a whole percent. The three make 100. */
  share: number;
}

/**
 * **Where the Games are decided** (US-32): one row per `Phase`, the Phase the
 * Game *ended* in, in results.
 *
 * Its column is the opposite of the configuration table's, which it touches on
 * screen: a Game ends in one Phase and one only, so **the shares make 100 %**.
 * It covers the whole history and costs no engine time — the boundary is read
 * off the PGN — which is the difference from `PhaseDamageTable` and is said on
 * the page rather than left for the reader to work out.
 */
export interface PhaseResultTable {
  rows: PhaseResultRow[];
  /** Every Game of the Profile. */
  games: number;
  /** Those filed under a Phase: `games` less `unreadable`. */
  filed: number;
  /** PGNs we could not replay — counted apart, in no row. */
  unreadable: number;
}

/** One `Phase`'s line of the damage table. Two readings, never folded. */
export interface PhaseDamageRow {
  phase: Phase;
  /** Analysed Games whose damage is heaviest here — the robust measure. */
  dominant: number;
  /** Analysed Games that REACHED this Phase: this row's own denominator. */
  reached: number;
  /** Mean share of a Game's damage falling here, over `reached`. */
  meanShare: number | null;
  /** Its median — the mean is never shown without it (ADR-0036, condition 3). */
  medianShare: number | null;
}

/**
 * **Where the damage falls** (ADR-0036's amendment of 2026-09-25): the same
 * axis as `PhaseResultTable`, the other currency, and deliberately a **second
 * table** — no composite, no shared column, no common ranking. The two do not
 * designate the same `Phase` on the requester's base, and that is the
 * information.
 *
 * It reads the **analysed** Games only, so its denominator is not the one above
 * it and both are written on the screen. And it ages backwards: every engine
 * pass improves it and moves `analysed` under the reader, so it announces a
 * count and never "your Games".
 */
export interface PhaseDamageTable {
  rows: PhaseDamageRow[];
  /** Analysed Games — the denominator of `dominant`. */
  analysed: number;
  /** All the Profile's Games, so the gap with the table above is on screen. */
  games: number;
  /** Analysed Games that lost nothing at all: no dominant Phase, and said. */
  undamaged: number;
}

/** One Endgame configuration's line on `/stats`: its writing, then its results. */
export interface SignatureRow extends StatsBucket {
  signature: string;
  /**
   * The material disagreement in points, signed — a **column**, never the key
   * of the row nor the order of the table (ADR-0036). `RR vs Q` is `+1` here,
   * which is the ADR's own argument shown rather than corrected.
   */
  delta: number;
}

/** What a band hides: the range of its own configurations' win rates. */
export interface MaterialSpread {
  /** Those seen at least `threshold` times — a spread of noise mitigates nothing. */
  configurations: number;
  lowest: number;
  highest: number;
}

/** One band's line: its couples, its results, and the spread it covers. */
export interface MaterialBandRow extends StatsBucket {
  band: string;
  spread: MaterialSpread | null;
}

/**
 * **The material disagreement set against the win rate** (US-32, requested
 * 2026-09-25): the same crossings as `SignatureTable`, on a second axis.
 *
 * A second table, never a re-grouping of the first: the configuration table
 * keeps the signature as its key and frequency as its order. Its unit is the
 * couple (Game, configuration), so it sums to no history either — and every row
 * carries the spread of what the band does not determine.
 */
export interface MaterialBandTable {
  rows: MaterialBandRow[];
  /** Every couple filed — the unit, announced rather than inferred. */
  couples: number;
  /** The bar a configuration clears to enter a spread. */
  threshold: number;
  /** The band holding material equality — the one the mitigation is about. */
  equalBand: string;
}

/**
 * The corpus table of `Material signature`s (ADR-0036), as served inside
 * `GET /api/stats`. **Its currency is the Game's result**, not chances lost: the
 * two scales are never folded, and a Game sits on as many rows as it crossed
 * configurations — so the rows do not add up to the history, which is why the
 * table states its `scope`.
 */
export interface SignatureTable {
  /** The number of Games a configuration needs before it gets a row. */
  threshold: number;
  rows: SignatureRow[];
  /** What stayed under the bar: counted and named on one line, never erased. */
  below: { configurations: number };
  /**
   * `unreadable` is counted apart from `withoutEndgame` on purpose: a PGN we
   * could not replay is our failure, not a fact about the Player's chess.
   */
  scope: { games: number; withEndgame: number; withoutEndgame: number; unreadable: number };
}
