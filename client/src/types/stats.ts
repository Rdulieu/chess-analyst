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
}
