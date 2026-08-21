import { useCallback, useEffect, useState } from "react";
import { acknowledgeAnalysis, fetchAnalysisStatus } from "../../api";
import { runAnalysis } from "./runAnalysis";
import type { AnalysisStatus } from "../../types";

/**
 * The Player's view of **one `Profile`'s** `Analysis pass`, shared by every
 * entry point that can start one ("Mes parties", the Analyse page and the
 * Profile's own page). The Profile is a parameter and not an ambient notion
 * (ADR-0014): the pass a screen reports on is the pass of the Player that screen
 * is about, and starting one commits engine time to that Player's Games alone — the single implementation of
 * the three things those pages need, never inlined twice:
 *
 * - **on arrival**, the last pass is loaded, so a summary the Player has not yet
 *   acknowledged reappears after a reload or a restart (the pass is persisted
 *   server-side, ADR-0011 — the page just has to ask);
 * - **run**, which drives the start+poll loop and keeps the final figure on
 *   screen rather than discarding it;
 * - **acknowledge**, which dismisses the summary for good.
 */
export function useAnalysisPass(profileId: number) {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  /** Set when the last click opened no pass at all — every Game was analyzed. */
  const [nothingToDo, setNothingToDo] = useState(false);

  useEffect(() => {
    // Switching Profile switches readouts: the previous one's summary must not
    // linger on a screen that is now about somebody else.
    setStatus(null);
    setNothingToDo(false);
    let live = true;
    fetchAnalysisStatus(profileId)
      .then((next) => live && setStatus(next))
      .catch(() => live && setStatus(null));
    return () => {
      live = false;
    };
  }, [profileId]);

  const run = useCallback(
    async (gameIds: number[]) => {
      setNothingToDo(false);
      const { started } = await runAnalysis(profileId, gameIds, setStatus);
      setNothingToDo(!started);
    },
    [profileId],
  );

  const acknowledge = useCallback(async () => {
    // Optimistic: the summary is a display concern, and leaving it on screen
    // while a 204 travels would make the click feel broken.
    setStatus((prev) => (prev ? { ...prev, acknowledged: true } : prev));
    await acknowledgeAnalysis(profileId).catch(() => {});
  }, [profileId]);

  return { status, nothingToDo, run, acknowledge, running: status?.running ?? false };
}
