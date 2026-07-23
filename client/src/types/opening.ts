import type { TimeControlCategory } from "./game";
import type { Side } from "./move-habit";

/**
 * A `Weak opening` entry as served by `GET /api/openings` (see CONTEXT.md): an
 * `Opening` the Player played as a given side within a given time control
 * category, with its results tally and `Win rate`. An entry only exists when
 * the Player has played it (games >= 1), so `winRate` is always a number.
 */
export interface WeakOpeningEntry {
  /** ECO code — the Opening's identity ("other" when chess.com did not classify it). */
  eco: string;
  openingName: string;
  side: Side;
  cadence: TimeControlCategory;
  games: number;
  win: number;
  draw: number;
  loss: number;
  winRate: number | null;
}
