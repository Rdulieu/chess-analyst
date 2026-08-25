import type { SearchRegime } from "./annotation";
import type { DeclaredSeverity } from "./personal";

/**
 * How a `Personal analysis` was written: with the engine's findings already shown
 * for that Game, or not. A **provenance, not a lock** — nothing claims the app
 * kept anyone blind, because it cannot.
 */
export type Provenance = "unaided" | "informed";

/**
 * The Player's `Declared severity`s against the measured ones, **undivided**.
 * The share is computed where it is read, never served: that is what lets the
 * aggregate be a sum of numerators over a sum of denominators rather than an
 * average of rates.
 */
export interface SeverityReading {
  /** The Player's `Counted Move`s — the denominator of coverage. */
  countedMoves: number;
  /** Those of them carrying a sealed verdict. Silence is not a verdict. */
  examined: number;
  /** Among the examined, those the engine has a band to answer — `Good` has none. */
  scorable: number;
  /** Among the scorable, those the engine agrees with. */
  agreed: number;
  /** What was declared against what was measured. The `good` row is never scored. */
  matrix: ConfusionMatrix;
  /** Verdicts shown and never scored, kept apart **by reason**. */
  unscored: { good: number; opponent: number };
}

/** Why one of the Player's Moves is not counted — the two are never melted into one. */
export type UncountedReason = "forced" | "decided";

/** One of the Player's Moves the analysis excludes, and what they said about it. */
export interface UncountedMove {
  ply: number;
  /** Standard notation, so the entry names its Move rather than numbering it. */
  notation: string | null;
  reason: UncountedReason;
  /** `null` when the Player said nothing here — silence, not a verdict. */
  declared: DeclaredSeverity | null;
}

/**
 * The second reading: not *did I judge well* but **did I look in the right
 * place**. Undivided, like everything else here — `damageTotal === 0` means
 * **no score**, never a zero.
 */
export interface KeyMomentReading {
  marked: number;
  /** Chances lost by the flagged Moves the markers point at. A Move counts once. */
  damageFound: number;
  /** Chances lost by **all** the Player's flagged counted Moves. */
  damageTotal: number;
  /** The `Drift` — beside the figure, and out of the division. */
  drift: number;
  misses: KeyMomentMiss[];
}

/** A marker that found nothing, and how far off it was. Shown, never credited. */
export interface KeyMomentMiss {
  ply: number;
  /** Standard notation, so a sentence names the Move rather than numbering it. */
  notation: string | null;
  lostThere: number;
  nearest: { ply: number; lost: number; notation: string | null } | null;
}

/** One mark written after the reveal: shown as a layer, never compared. */
export interface PosteriorMark {
  ply: number;
  notation: string | null;
  declaredSeverity: DeclaredSeverity | null;
  note: string | null;
  keyMoment: boolean;
}

/** What the engine said about a Move: one of its three bands, or nothing at all. */
export type MeasuredLabel = "blunder" | "mistake" | "inaccuracy" | "none";

/**
 * The **confusion matrix**: declared band -> measured label -> how many Moves.
 * Rows are the five declared bands, columns the three measured ones **plus
 * `none`** — "the engine flagged nothing", a fact rather than an absence, and the
 * column that makes `Sound` scorable at all.
 */
export type ConfusionMatrix = Record<DeclaredSeverity, Record<MeasuredLabel, number>>;

/** The four columns, worst to "nothing flagged". */
export const MEASURED_LABELS: MeasuredLabel[] = ["blunder", "mistake", "inaccuracy", "none"];

/** One Game's `Confrontation` (CONTEXT.md), as the API answers it. */
export interface GameConfrontation {
  gameId: number;
  sealedAt: string;
  provenance: Provenance;
  regime: SearchRegime | null;
  severity: SeverityReading;
  /** Where the Player looked — the `Key moment` reading. */
  keyMoments: KeyMomentReading;
  /** The Player's Moves the analysis does not count, each with its reason. */
  uncounted: UncountedMove[];
  /** What was written after the seal — shown, never counted. */
  posterior: PosteriorMark[];
}

/** Why there is no `Confrontation` to show — two facts, two different next steps. */
export type ConfrontationRefusalReason = "not-sealed" | "not-analyzed";
