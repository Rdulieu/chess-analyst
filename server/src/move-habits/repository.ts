import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import { moveHabits } from "../db/schema";
import type { TimeControlCategory } from "../platform";

/** A candidate Move from a Position (for one side), with its Move habit stats. */
export interface MoveHabitCandidate {
  san: string;
  count: number;
  win: number;
  draw: number;
  loss: number;
  /** Standard chess scoring, Player-relative: (win + 0.5·draw) / count. */
  winRate: number;
  byCategory: Record<TimeControlCategory, number>;
}

/**
 * The candidate Moves recorded from a Position (`fen`, 4-field) for the side the
 * Player played, most-played first. At the Player's turn these are the Player's
 * own `Move habit`s; at the opponent's turn they are `Opponent reply`s — the
 * caller reads that from the Position's side to move. Win rate is always
 * Player-relative.
 *
 * Counted for **one `Profile`** (ADR-0014): the counters are keyed by Profile,
 * so two players reaching the same Position keep two rows and their repertoires
 * are never added into a single line.
 */
export function listCandidates(
  db: Db,
  profileId: number,
  fen: string,
  side: "white" | "black",
): MoveHabitCandidate[] {
  return db
    .select()
    .from(moveHabits)
    .where(
      and(eq(moveHabits.profileId, profileId), eq(moveHabits.fen, fen), eq(moveHabits.side, side)),
    )
    .all()
    .map((r) => ({
      san: r.san,
      count: r.count,
      win: r.win,
      draw: r.draw,
      loss: r.loss,
      winRate: r.count === 0 ? 0 : (r.win + 0.5 * r.draw) / r.count,
      byCategory: { bullet: r.bullet, blitz: r.blitz, rapid: r.rapid, daily: r.daily },
    }))
    .sort((a, b) => b.count - a.count);
}
