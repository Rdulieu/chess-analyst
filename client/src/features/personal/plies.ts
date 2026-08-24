/**
 * Whether ply `k` is a Move the **Player themself** played. Ply 1 is White's
 * first Move, so odd plies are White's and even ones Black's; ply 0 is the
 * starting Position and nobody's Move.
 *
 * The one place the side is worked out, because it is the only thing that
 * separates a verdict the confrontation will score from one it will keep and not
 * score (US-16b). The **model** draws no such line: marks live on every ply,
 * the opponent's included.
 */
export function playersOwnPly(ply: number, playerColor: "white" | "black"): boolean {
  if (ply === 0) return false;
  return (ply % 2 === 1) === (playerColor === "white");
}
