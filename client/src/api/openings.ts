import type { WeakOpeningEntry } from "../types";

/**
 * One `Profile`'s `Weak opening` entries (GET /api/openings), aggregated
 * server-side — one per (opening, side, cadence), sorted by game count
 * descending. A repertoire belongs to one player (ADR-0014).
 */
export async function fetchWeakOpenings(profileId: number): Promise<WeakOpeningEntry[]> {
  const res = await fetch(`/api/openings?profileId=${profileId}`);
  if (!res.ok) throw new Error(`Failed to load openings (${res.status})`);
  const body = (await res.json()) as { openings: WeakOpeningEntry[] };
  return body.openings;
}
