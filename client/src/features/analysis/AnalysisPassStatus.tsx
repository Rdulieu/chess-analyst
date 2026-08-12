import type { AnalysisStatus } from "../../types";

/**
 * The Player-facing readout of an `Analysis pass` — **the single implementation**,
 * called from every entry point that can start a pass ("Mes parties" and the
 * Analyse page), never inlined twice.
 *
 * While the pass runs it shows the live count, in **Positions evaluated** (US-8,
 * ADR-0010) — a pass evaluates every Position of every Game it covers, so
 * counting whole Games left a single-Game pass reading `0/1` for its entire
 * multi-minute run. "Positions" is also what the store holds (one `Evaluation`
 * per Position), so the figure shown and the figure recorded are the same thing.
 *
 * Once it is over, the Player is told **how it ended** rather than left to infer
 * it from a number (CONTEXT.md, `Analysis pass`): completed, interrupted by a
 * shutdown, or failed — the failure carrying what went wrong, which used to
 * reach the server console only. The message stays until **dismissed**, so a
 * Player who stepped away during a minutes-long pass cannot miss it, and an
 * acknowledged one never comes back.
 *
 * The dismiss control sits **outside** the `role="status"` live region: inside,
 * assistive tech would read "Fermer" at the end of every progress announcement.
 */
export function AnalysisPassStatus({
  status,
  nothingToDo = false,
  onAcknowledge,
}: {
  status: AnalysisStatus | null;
  nothingToDo?: boolean;
  onAcknowledge?: () => void;
}) {
  // The Player asked for an analysis and none was needed. Said plainly, so an
  // instantly-finished action does not read as a failure or as a stale summary.
  if (nothingToDo) return <Live>Rien à analyser : la sélection est déjà analysée.</Live>;

  // Nothing to report: no pass has ever run, or the Player has already seen
  // this one.
  if (!status || status.games === 0) return null;
  if (!status.running && status.acknowledged) return null;

  if (status.running) {
    return (
      <Live>
        {status.done}/{status.total} positions évaluées
      </Live>
    );
  }

  const games = `${status.games} ${status.games > 1 ? "parties" : "partie"}`;
  const message =
    status.outcome === "failed"
      ? `Échec de l'analyse après ${status.done}/${status.total} positions évaluées — ${status.error ?? "cause inconnue"}`
      : status.outcome === "interrupted"
        ? `Analyse interrompue à ${status.done}/${status.total} positions évaluées — relancez-la pour reprendre`
        : `${games} · ${status.done} positions évaluées ✓`;

  return (
    <>
      <Live>{message}</Live>
      <button type="button" onClick={onAcknowledge}>
        Fermer
      </button>
    </>
  );
}

function Live({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" aria-label="progression de l'analyse">
      {children}
    </p>
  );
}
