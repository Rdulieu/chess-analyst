import { startAnalysis, fetchAnalysisStatus } from "../../api";
import type { AnalysisStatus } from "../../types";

/** How often to poll the analysis-pass status while it runs (ms). */
const POLL_MS = 500;

/**
 * Runs the engine analysis pass for the given Games to completion, reporting
 * progress via `onProgress` after the start and after every subsequent poll.
 * The single implementation of the start+poll loop, shared by "Mes parties"
 * (a batch of Games) and the Analyse page (one Game) — US-4/US-7.
 */
export async function runAnalysis(
  gameIds: number[],
  onProgress: (status: AnalysisStatus) => void,
): Promise<void> {
  let status = await startAnalysis(gameIds);
  onProgress(status);
  while (status.running) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    status = await fetchAnalysisStatus();
    onProgress(status);
  }
}
