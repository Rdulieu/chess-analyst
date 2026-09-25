import type { TimeControlCategory } from "./game";

/** Player-relative results over a set of Games. `winRate` is null when games = 0. */
export interface StatsBucket {
  games: number;
  win: number;
  draw: number;
  loss: number;
  winRate: number | null;
}

/** History-wide results summary as served by `GET /api/stats`. */
export interface StatsSummary {
  total: StatsBucket;
  byCategory: Record<TimeControlCategory, StatsBucket>;
  bySide: Record<"white" | "black", StatsBucket>;
  signatures: SignatureTable;
}

/** One Endgame configuration's line on `/stats`: its writing, then its results. */
export interface SignatureRow extends StatsBucket {
  signature: string;
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
