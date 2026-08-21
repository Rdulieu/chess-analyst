import { useAnalysisPass } from "./useAnalysisPass";
import { AnalysisPassStatus } from "./AnalysisPassStatus";

/**
 * Where one `Profile`'s `Analysis pass` stands, on that Profile's own page.
 *
 * Read-only on purpose: this page is where a Player takes stock of an account —
 * how much of its history is imported, how much analysed, how the last pass
 * ended. Starting one is done from the screens that hold a *selection* of Games
 * ("Mes parties", Analyse), and offering a fourth "analyse everything" button
 * here would commit engine time from a page that shows no Game at all.
 *
 * The readout itself is `AnalysisPassStatus` — the single implementation, shared
 * with every other entry point rather than reproduced here.
 */
export function ProfileAnalysisPass({ profileId }: { profileId: number }) {
  const { status, acknowledge } = useAnalysisPass(profileId);

  return <AnalysisPassStatus status={status} onAcknowledge={acknowledge} />;
}
