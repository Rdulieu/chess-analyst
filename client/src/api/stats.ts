import type { StatsSummary } from "../types";

/** The history-wide results summary (GET /api/stats), aggregated server-side. */
export async function fetchStats(): Promise<StatsSummary> {
  const res = await fetch("/api/stats");
  if (!res.ok) throw new Error(`Failed to load stats (${res.status})`);
  return (await res.json()) as StatsSummary;
}
