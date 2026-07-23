import type { Db } from "../db";
import { games } from "../db/schema";
import type { TimeControlCategory } from "../chesscom";

const CATEGORIES: TimeControlCategory[] = ["bullet", "blitz", "rapid", "daily"];

/** Results over a set of Games (Player-relative). */
export interface Bucket {
  games: number;
  win: number;
  draw: number;
  loss: number;
  /** Standard scoring `(win + 0.5·draw)/games`; null when there are no Games. */
  winRate: number | null;
}

/** History-wide results summary (see PRD / CONTEXT.md `Win rate`). */
export interface StatsSummary {
  total: Bucket;
  byCategory: Record<TimeControlCategory, Bucket>;
  bySide: Record<"white" | "black", Bucket>;
}

type ResultRow = { result: "win" | "draw" | "loss" };

function bucket(rows: ResultRow[]): Bucket {
  const win = rows.filter((r) => r.result === "win").length;
  const draw = rows.filter((r) => r.result === "draw").length;
  const loss = rows.filter((r) => r.result === "loss").length;
  const games = rows.length;
  return {
    games,
    win,
    draw,
    loss,
    winRate: games === 0 ? null : (win + 0.5 * draw) / games,
  };
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
