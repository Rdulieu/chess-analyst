import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { games } from "../db/schema";
import { TIME_CONTROL_CATEGORIES, type TimeControlCategory } from "../platform";
import { bucket, type Bucket } from "../results/win-rate";

/** History-wide results summary (see PRD / CONTEXT.md `Win rate`). */
export interface StatsSummary {
  total: Bucket;
  byCategory: Record<TimeControlCategory, Bucket>;
  bySide: Record<"white" | "black", Bucket>;
}

/**
 * Aggregates **one `Profile`'s** Games on the fly into that player's summary
 * (ADR-0014). The `Win rate` this returns is one player's win rate; averaging
 * two histories into it would produce a figure that is nobody's.
 */
export function getStats(db: Db, profileId: number): StatsSummary {
  const rows = db.select().from(games).where(eq(games.profileId, profileId)).all();
  return {
    total: bucket(rows),
    byCategory: Object.fromEntries(
      TIME_CONTROL_CATEGORIES.map((c) => [c, bucket(rows.filter((r) => r.timeControlCategory === c))]),
    ) as Record<TimeControlCategory, Bucket>,
    bySide: {
      white: bucket(rows.filter((r) => r.playerColor === "white")),
      black: bucket(rows.filter((r) => r.playerColor === "black")),
    },
  };
}
