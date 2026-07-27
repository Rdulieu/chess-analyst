import type { DangerEntry } from "../types";

/**
 * The `Danger position` entries (GET /api/danger), derived server-side on the
 * fly — already sorted by reach count descending.
 */
export async function fetchDangerPositions(): Promise<DangerEntry[]> {
  const res = await fetch("/api/danger");
  if (!res.ok) throw new Error(`Failed to load danger positions (${res.status})`);
  const body = (await res.json()) as { dangers: DangerEntry[] };
  return body.dangers;
}
