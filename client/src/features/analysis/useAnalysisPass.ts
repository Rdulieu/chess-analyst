import { useCallback, useEffect, useState } from "react";
import { acknowledgeAnalysis, fetchAnalysisStatus } from "../../api";
import { runAnalysis } from "./runAnalysis";
import type { AnalysisStatus } from "../../types";

/**
 * The Player's view of the `Analysis pass`, shared by every entry point that can
 * start one ("Mes parties" and the Analyse page) — the single implementation of
 * the three things those pages need, never inlined twice:
 *
 * - **on arrival**, the last pass is loaded, so a summary the Player has not yet
 *   acknowledged reappears after a reload or a restart (the pass is persisted
 *   server-side, ADR-0010 — the page just has to ask);
 * - **run**, which drives the start+poll loop and keeps the final figure on
 *   screen rather than discarding it;
 * - **acknowledge**, which dismisses the summary for good.
 */
export function useAnalysisPass() {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  /** Set when the last click opened no pass at all — every Game was analyzed. */
  const [nothingToDo, setNothingToDo] = useState(false);

  useEffect(() => {
    fetchAnalysisStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  const run = useCallback(async (gameIds: number[]) => {
    setNothingToDo(false);
    const { started } = await runAnalysis(gameIds, setStatus);
    setNothingToDo(!started);
  }, []);

  const acknowledge = useCallback(async () => {
    // Optimistic: the summary is a display concern, and leaving it on screen
    // while a 204 travels would make the click feel broken.
    setStatus((prev) => (prev ? { ...prev, acknowledged: true } : prev));
    await acknowledgeAnalysis().catch(() => {});
  }, []);

  return { status, nothingToDo, run, acknowledge, running: status?.running ?? false };
}
