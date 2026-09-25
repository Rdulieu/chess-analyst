import type { StatsDamage, StatsReplay, StatsSummary } from "../types";

/**
 * `/stats` reads its figures through **three** requests, not one, and the split
 * is by price rather than by subject (US-32 slice 08): the cheap summary paints
 * the page, the two expensive groups land behind it, each into its own block.
 */
async function read<T>(path: string, what: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${what} (${res.status})`);
  return (await res.json()) as T;
}

/**
 * One `Profile`'s results summary (GET /api/stats) — sub-millisecond server
 * side, and the first useful thing on the screen.
 */
export function fetchStats(profileId: number): Promise<StatsSummary> {
  return read(`/api/stats?profileId=${profileId}`, "stats");
}

/**
 * The three tables one PGN replay feeds (GET /api/stats/replay) — tens of
 * seconds cold on a large history, and one request because one replay.
 */
export function fetchStatsReplay(profileId: number): Promise<StatsReplay> {
  return read(`/api/stats/replay?profileId=${profileId}`, "stats replay");
}

/**
 * The damage table (GET /api/stats/recaps) — the `gameRecap` fold over the
 * analysed Games, independent of the replay above.
 */
export function fetchStatsDamage(profileId: number): Promise<StatsDamage> {
  return read(`/api/stats/recaps?profileId=${profileId}`, "stats recaps");
}
