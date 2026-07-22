import type { TimeControlCategory } from "./game";

/** Which side the Player played — the explorer is scoped to one at a time. */
export type Side = "white" | "black";

/**
 * A candidate Move from a Position, for one side, with its `Move habit` stats
 * (see CONTEXT.md). At the Player's turn it is one of their own `Move habit`s;
 * at the opponent's turn an `Opponent reply`. `winRate` is Player-relative.
 */
export interface MoveHabitCandidate {
  san: string;
  count: number;
  win: number;
  draw: number;
  loss: number;
  winRate: number;
  byCategory: Record<TimeControlCategory, number>;
}
