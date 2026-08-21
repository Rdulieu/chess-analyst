import type { DangerEntry } from "../types";

/** What `/api/danger` serves: the ranked aggregate, and how many Games it was
 *  derived from — an empty list means nothing without that second figure. */
export interface DangerView {
  dangers: DangerEntry[];
  analyzedGames: number;
}

/**
 * One `Profile`'s `Danger position` view (GET /api/danger), derived server-side
 * on the fly — the full list, ranked by serious-error proportion. A recurring
 * Position is one *this* Player keeps reaching (CONTEXT.md).
 */
export async function fetchDangerView(profileId: number): Promise<DangerView> {
  const res = await fetch(`/api/danger?profileId=${profileId}`);
  if (!res.ok) throw new Error(`Failed to load danger positions (${res.status})`);
  return (await res.json()) as DangerView;
}
