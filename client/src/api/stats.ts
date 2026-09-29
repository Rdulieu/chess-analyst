import type { StatsDamage, StatsReplay, StatsSummary } from "../types";

/**
 * `/stats` reads its figures through **three** requests, not one, and the split
 * is by price rather than by subject (US-32 slice 08): the cheap summary paints
 * the page, the two expensive groups land behind it, each into its own block.
 */
/**
 * **The message the Player reads is ours** (US-32 slice 09).
 *
 * The damage block's failure used to read « Erreur : impossible de charger vos
 * dégâts par phase (**Failed to fetch**) » — the browser's own string, in
 * English, naming a mechanism the Player has no view of. That is exactly the
 * reproach `profile-deletion/01` files against another screen: the driver's
 * words where ours belong.
 *
 * The technical cause is not thrown away, it is **moved**: it goes to the
 * console and rides on the error's `cause`, where the person who can act on it
 * looks, and the screen gets a sentence in the Player's language saying which of
 * the two things happened — the server did not answer at all, or it answered
 * badly and here is its status.
 */
async function read<T>(path: string, what: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path);
  } catch (cause) {
    console.error(`GET ${path} failed`, cause);
    throw new Error("le serveur n'a pas répondu", { cause });
  }
  if (!res.ok) {
    const cause = new Error(`GET ${path} answered ${res.status} (${what})`);
    console.error(cause.message);
    throw new Error(`le serveur a répondu ${res.status}`, { cause });
  }
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
