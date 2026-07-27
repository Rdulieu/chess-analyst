/** The `cp`/`mate` an `Evaluation` needs (CONTEXT.md) — not the full `EngineEvaluation` (its `bestmove` is irrelevant here, and the stored `evaluations` table doesn't keep one, ADR-0009). */
export interface CpOrMate {
  cp: number | null;
  mate: number | null;
}

/**
 * The side-to-move's winning chances (0–100), converted from an `Evaluation`
 * via the standard public winning-chances sigmoid popularised by Lichess
 * (their exact regression is proprietary — ADR-0009 adopts the method and
 * thresholds, not a bit-identical curve).
 */
export function winningChances(evaluation: CpOrMate): number {
  if (evaluation.mate !== null) return evaluation.mate > 0 ? 100 : 0;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * evaluation.cp!)) - 1);
}
