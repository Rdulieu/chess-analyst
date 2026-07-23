import type { WeakOpeningEntry } from "../types";

/**
 * The `Weak opening` entries (GET /api/openings), aggregated server-side — one
 * per (opening, side, cadence), already sorted by game count descending.
 */
export async function fetchWeakOpenings(): Promise<WeakOpeningEntry[]> {
  const res = await fetch("/api/openings");
  if (!res.ok) throw new Error(`Failed to load openings (${res.status})`);
  const body = (await res.json()) as { openings: WeakOpeningEntry[] };
  return body.openings;
}
