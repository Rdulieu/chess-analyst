/**
 * The **material disagreement** of a `Material signature`: the Player's majors
 * and minors less their opponent's, in points, signed.
 *
 * **This is the scalar ADR-0036 refuses as an identity, offered here as a
 * column and nothing else.** `RR vs Q` is `+1` here — the very reading the ADR
 * uses to show that no number can name an imbalance of nature. That is not a
 * repeal, at three conditions the screen owes: the number is never the key of a
 * row, never the sort of a table, and never a grouping of the configurations.
 * A configuration is identified by its signature; this only says which band it
 * sits in, and says nothing *inside* the band.
 *
 * **It derives from the signature string**, not from a FEN and not from a
 * replay: the configurations are already folded when this runs, so the column
 * costs `/stats` nothing (US-32, no engine time, no column, no migration).
 *
 * Kings and pawns are out by construction — they are not in the signature.
 * ADR-0036: "a pawn up is exactly what a scalar says well", and a king is not
 * material.
 */

/** The scale, in one place. It is also written on the screen: a `+1` cannot be
 *  read without knowing that a queen is 9 and two rooks are 10. */
export const PIECE_VALUES = { Q: 9, R: 5, B: 3, N: 3 } as const;

/** How the scale reads on screen, worded once, beside the column it explains. */
export const SCALE_LABEL = "Barème : dame 9 · tour 5 · fou 3 · cavalier 3";

/** The separator and the empty side, as `signature()` writes them. */
const VERSUS = " vs ";

function points(side: string): number {
  let total = 0;
  for (const man of side) {
    total += PIECE_VALUES[man as keyof typeof PIECE_VALUES] ?? 0;
  }
  return total;
}

/**
 * The signed disagreement of one signature, the Player's side first — `+1` for
 * `RR vs Q`, `−1` for `Q vs RR`, `0` for `— vs —`.
 */
export function materialDelta(signature: string): number {
  const [mine, theirs] = signature.split(VERSUS);
  return points(mine ?? "") - points(theirs ?? "");
}
