import type { AnalysisStatus } from "../types";

/**
 * Every call here names the `Profile` it is about (ADR-0014). An `Analysis pass`
 * runs over **one** Profile's Games and is reported on that Profile's screens,
 * so there is deliberately no way to start one, poll one, or dismiss one without
 * saying whose it is — the server refuses an unscoped request outright.
 */

/**
 * Starts the engine analysis pass over the given Games of a Profile
 * (POST /api/analyze). `started` says whether a pass was actually opened: a
 * selection whose Games are all analyzed already opens none, and the Player is
 * told so rather than left reading a stale summary.
 */
export async function startAnalysis(
  profileId: number,
  gameIds: number[],
): Promise<AnalysisStatus & { started: boolean }> {
  const res = await fetch(`/api/analyze?profileId=${profileId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameIds }),
  });
  if (!res.ok) throw new Error(`Failed to start analysis (${res.status})`);
  return (await res.json()) as AnalysisStatus & { started: boolean };
}

/** One Profile's own analysis-pass progress (GET /api/analyze/status). */
export async function fetchAnalysisStatus(profileId: number): Promise<AnalysisStatus> {
  const res = await fetch(`/api/analyze/status?profileId=${profileId}`);
  if (!res.ok) throw new Error(`Failed to load analysis status (${res.status})`);
  return (await res.json()) as AnalysisStatus;
}

/**
 * Marks this Profile's last `Analysis pass`'s summary as seen by the Player, so
 * it stops being shown. Display only — the pass's own record is untouched.
 */
export async function acknowledgeAnalysis(profileId: number): Promise<void> {
  const res = await fetch(`/api/analyze/acknowledge?profileId=${profileId}`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to acknowledge the analysis pass (${res.status})`);
}
