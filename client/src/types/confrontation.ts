import type { SearchRegime } from "./annotation";

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
}

/** One Game's `Confrontation` (CONTEXT.md), as the API answers it. */
export interface GameConfrontation {
  gameId: number;
  sealedAt: string;
  provenance: Provenance;
  regime: SearchRegime | null;
  severity: SeverityReading;
}

/** Why there is no `Confrontation` to show — two facts, two different next steps. */
export type ConfrontationRefusalReason = "not-sealed" | "not-analyzed";
