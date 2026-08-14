import type { DangerEntry } from "../types";

/** What `/api/danger` serves: the ranked aggregate, and how many Games it was
 *  derived from — an empty list means nothing without that second figure. */
export interface DangerView {
  dangers: DangerEntry[];
  analyzedGames: number;
}

/**
 * The `Danger position` view (GET /api/danger), derived server-side on the fly
 * — the full list, already ranked by serious-error proportion.
 */
export async function fetchDangerView(): Promise<DangerView> {
  const res = await fetch("/api/danger");
  if (!res.ok) throw new Error(`Failed to load danger positions (${res.status})`);
  return (await res.json()) as DangerView;
}
