import { startAnalysis, fetchAnalysisStatus } from "../../api";
import type { AnalysisStatus } from "../../types";

/** How often to poll the analysis-pass status while it runs (ms). */
const POLL_MS = 500;

/**
 * Runs the engine analysis pass for the given Games of a `Profile` to
 * completion, reporting
 * progress via `onProgress` after the start and after every subsequent poll.
 * The single implementation of the start+poll loop, shared by "Mes parties"
 * (a batch of Games) and the Analyse page (one Game) — US-4/US-7.
 */
export async function runAnalysis(
  profileId: number,
  gameIds: number[],
  onProgress: (status: AnalysisStatus) => void,
): Promise<{ started: boolean }> {
  const start = await startAnalysis(profileId, gameIds);
  let status: AnalysisStatus = start;
  onProgress(status);
  while (status.running) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    status = await fetchAnalysisStatus(profileId);
    onProgress(status);
  }
  return { started: start.started };
}
