import type { AnalysisStatus } from "../../types";

/**
 * The Player-facing readout of an `Analysis pass` — **the single implementation**,
 * called from every entry point that can start a pass ("Mes parties" and the
 * Analyse page), never inlined twice.
 *
 * Two states:
 *
 * - **while it runs**: the live count, in **Positions evaluated** (US-8,
 *   ADR-0010) — a pass evaluates every Position of every Game it covers, so
 *   counting whole Games left a single-Game pass reading `0/1` for its entire
 *   multi-minute run. "Positions" is also what the store holds (one `Evaluation`
 *   per Position), so the figure shown and the figure recorded are the same
 *   thing; CONTEXT.md keeps `Position` and `Move` distinct and this is a
 *   Position count.
 * - **once it is over**: a summary the Player can check against what they
 *   selected — hence the Game count, which the running readout has no use for.
 *   It stays until **dismissed**, so a Player who stepped away during a
 *   minutes-long pass cannot miss the confirmation, and an acknowledged one
 *   never comes back.
 *
 * `role="status"` so a long-running pass stays announced to assistive tech.
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
  if (nothingToDo)
    return (
      <p role="status" aria-label="progression de l'analyse">
        Rien à analyser : la sélection est déjà analysée.
      </p>
    );

  // Nothing to report: no pass has ever run, or the Player has already seen
  // this one.
  if (!status || status.games === 0) return null;
  if (!status.running && status.acknowledged) return null;

  if (status.running) {
    return (
      <p role="status" aria-label="progression de l'analyse">
        {status.done}/{status.total} positions évaluées
      </p>
    );
  }

  return (
    <p role="status" aria-label="progression de l'analyse">
      {status.games} {status.games > 1 ? "parties" : "partie"} · {status.done} positions évaluées ✓
      <button type="button" onClick={onAcknowledge} style={{ marginLeft: "0.5rem" }}>
        Fermer
      </button>
    </p>
  );
}
