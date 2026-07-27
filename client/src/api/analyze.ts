import type { AnalysisStatus } from "../types";

/** Starts the engine analysis pass over the given Games (POST /api/analyze). */
export async function startAnalysis(gameIds: number[]): Promise<AnalysisStatus> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameIds }),
  });
  if (!res.ok) throw new Error(`Failed to start analysis (${res.status})`);
  return (await res.json()) as AnalysisStatus;
}

/** The current analysis-pass progress (GET /api/analyze/status). */
export async function fetchAnalysisStatus(): Promise<AnalysisStatus> {
  const res = await fetch("/api/analyze/status");
  if (!res.ok) throw new Error(`Failed to load analysis status (${res.status})`);
  return (await res.json()) as AnalysisStatus;
}
