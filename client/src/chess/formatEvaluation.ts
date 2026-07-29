/** A White-relative `Evaluation` (CONTEXT.md) as served by the annotations API. */
export interface WhiteRelativeEvaluation {
  cp: number | null;
  mate: number | null;
}

/**
 * Formats a White-relative `Evaluation` for display, chess.com/Lichess style:
 * pawns to one decimal with an explicit sign (`+1.3`/`-0.7`), or `M<n>`/`-M<n>`
 * for a forced mate. Purely a presentation concern over the numeric value the
 * server already converted (CONTEXT.md — no calculation happens here).
 */
export function formatEvaluation({ cp, mate }: WhiteRelativeEvaluation): string {
  if (mate !== null) return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  const pawns = cp! / 100;
  const sign = pawns > 0 ? "+" : pawns < 0 ? "-" : "";
  return `${sign}${Math.abs(pawns).toFixed(1)}`;
}
