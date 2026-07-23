import type { Db } from "../db";
import { games } from "../db/schema";
import type { TimeControlCategory } from "../chesscom";
import { bucket, type Bucket } from "../results/win-rate";

const CATEGORIES: TimeControlCategory[] = ["bullet", "blitz", "rapid", "daily"];

/** History-wide results summary (see PRD / CONTEXT.md `Win rate`). */
export interface StatsSummary {
  total: Bucket;
  byCategory: Record<TimeControlCategory, Bucket>;
  bySide: Record<"white" | "black", Bucket>;
}

/** Aggregates the retained Games on the fly into a history-wide summary. */
export function getStats(db: Db): StatsSummary {
  const rows = db.select().from(games).all();
  return {
    total: bucket(rows),
    byCategory: Object.fromEntries(
      CATEGORIES.map((c) => [c, bucket(rows.filter((r) => r.timeControlCategory === c))]),
    ) as Record<TimeControlCategory, Bucket>,
    bySide: {
      white: bucket(rows.filter((r) => r.playerColor === "white")),
      black: bucket(rows.filter((r) => r.playerColor === "black")),
    },
  };
}
