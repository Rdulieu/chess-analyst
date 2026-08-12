/**
 * Determinate progress of the `Analysis pass` (GET /api/analyze/status),
 * counted in **Positions evaluated** — a pass evaluates every Position of every
 * Game it covers, so counting whole Games left a single-Game pass reading `0/1`
 * for its entire run (US-8, ADR-0010).
 */
export interface AnalysisStatus {
  running: boolean;
  /** Positions the pass set out to evaluate. */
  total: number;
  /** Positions evaluated so far — derived server-side from the stored Evaluations. */
  done: number;
  /** Games the pass covers, for the Player-facing summary line. */
  games: number;
  /** Whether the Player has dismissed this pass's summary. */
  acknowledged: boolean;
  /** How the pass ended; null while it runs (CONTEXT.md, `Analysis pass`). */
  outcome: "completed" | "interrupted" | "failed" | null;
  /** What went wrong, on a failed pass. */
  error: string | null;
}
