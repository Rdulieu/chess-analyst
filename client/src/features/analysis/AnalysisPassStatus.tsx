import type { AnalysisStatus } from "../../types";

/**
 * The Player-facing readout of an `Analysis pass` — **the single implementation**,
 * called from every entry point that can start a pass ("Mes parties" and the
 * Analyse page), never inlined twice.
 *
 * Progress is counted in **Positions evaluated** (US-8, ADR-0010): a pass
 * evaluates every Position of every Game it covers, so counting whole Games left
 * a single-Game pass reading `0/1` for its entire multi-minute run. "Positions"
 * is also what the store actually holds — one `Evaluation` per Position — so the
 * figure shown and the figure recorded are the same thing (CONTEXT.md keeps
 * `Position` and `Move` distinct, and this is a Position count).
 *
 * `role="status"` so a long-running pass stays announced to assistive tech.
 */
export function AnalysisPassStatus({ status }: { status: AnalysisStatus | null }) {
  if (!status) return null;

  return (
    <p role="status" aria-label="progression de l'analyse">
      {status.done}/{status.total} positions évaluées
    </p>
  );
}
