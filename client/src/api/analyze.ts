import type { AnalysisStatus } from "../types";

/**
 * Starts the engine analysis pass over the given Games (POST /api/analyze).
 * `started` says whether a pass was actually opened: a selection whose Games are
 * all analyzed already opens none, and the Player is told so rather than left
 * reading a stale summary.
 */
export async function startAnalysis(
  gameIds: number[],
): Promise<AnalysisStatus & { started: boolean }> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameIds }),
  });
  if (!res.ok) throw new Error(`Failed to start analysis (${res.status})`);
  return (await res.json()) as AnalysisStatus & { started: boolean };
}

/** The current analysis-pass progress (GET /api/analyze/status). */
export async function fetchAnalysisStatus(): Promise<AnalysisStatus> {
  const res = await fetch("/api/analyze/status");
  if (!res.ok) throw new Error(`Failed to load analysis status (${res.status})`);
  return (await res.json()) as AnalysisStatus;
}

/**
 * Marks the last `Analysis pass`'s summary as seen by the Player, so it stops
 * being shown. Display only — the pass's own record is untouched.
 */
export async function acknowledgeAnalysis(): Promise<void> {
  const res = await fetch("/api/analyze/acknowledge", { method: "POST" });
  if (!res.ok) throw new Error(`Failed to acknowledge the analysis pass (${res.status})`);
}
