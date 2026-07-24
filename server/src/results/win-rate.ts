/**
 * The `Win rate` glossary term (CONTEXT.md), as a shared domain primitive. It is
 * the canonical results metric reused wherever Games are scored — the global
 * stats view (US-6) and the `Weak opening` view (US-3) alike — so it has ONE
 * implementation here, in a neutral module both features depend on, rather than
 * being duplicated per feature or bolted onto one feature's repository (ADR-0007).
 *
 * Each feature composes its own row shape *around* a `Bucket` (e.g. attaching an
 * opening, a side and a cadence) instead of widening this type.
 */

/** Player-relative results over a set of Games. */
export interface Bucket {
  games: number;
  win: number;
  draw: number;
  loss: number;
  /** Standard scoring `(win + 0.5·draw)/games`; null when there are no Games. */
  winRate: number | null;
}

type ResultRow = { result: "win" | "draw" | "loss" };

/** Tallies a set of Games (by Player-relative result) into a `Bucket`. */
export function bucket(rows: ResultRow[]): Bucket {
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
