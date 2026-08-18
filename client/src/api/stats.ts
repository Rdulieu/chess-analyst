import type { StatsSummary } from "../types";

/** One `Profile`'s results summary (GET /api/stats), aggregated server-side. */
export async function fetchStats(profileId: number): Promise<StatsSummary> {
  const res = await fetch(`/api/stats?profileId=${profileId}`);
  if (!res.ok) throw new Error(`Failed to load stats (${res.status})`);
  return (await res.json()) as StatsSummary;
}
