import type { ConfusionMatrix, DeclaredSeverity, MeasuredLabel } from "../../types";

export type { ConfusionMatrix };

/** Which way a reading leans, with the counts it is read off. */
export interface Bias {
  /** Verdicts placed **above** what was measured — danger seen where there is less. */
  over: number;
  /** Verdicts placed **below** — danger missed. */
  under: number;
  /** The way it leans, or `null` when the cells do not support saying. */
  direction: "over" | "under" | null;
}

/**
 * How severe each band claims a Move is. `Sound` sits at the bottom **beside**
 * `none`: both say *nothing wrong here*, which is why a `Sound` on an unflagged
 * Move is an agreement rather than a near miss.
 */
const RANK: Record<Exclude<DeclaredSeverity, "good"> | MeasuredLabel, number> = {
  blunder: 3,
  mistake: 2,
  inaccuracy: 1,
  sound: 0,
  none: 0,
};

/**
 * How few divergences may still carry a sentence. Below this, the matrix is
 * **not asked** to lean: a confident phrase drawn from two cells says less than
 * silence, and this screen's whole discipline is not to assert past its sample.
 */
const ENOUGH_TO_LEAN = 3;

/**
 * **The direction of the bias** (CONTEXT.md) — the one further fact worth folding,
 * and it costs nothing because the matrix already holds it.
 *
 * Over-reading danger and under-reading it are **opposite faults of analysis**,
 * and none of the three figures separates them alone: a Player at 40% accuracy
 * could be crying wolf or sleeping through blunders, and the remedy is not the
 * same. The matrix is not symmetric, and that asymmetry is exactly this.
 *
 * Read off the cells the Player can see, so the sentence is checkable against
 * them — the clarity of the calculation being a requirement of its own here.
 *
 * The **`good` row is skipped**: the engine has no band for merit, so a `Good`
 * facing anything is not the Player misjudging danger in either direction. It is
 * a verdict with nothing on the other side.
 */
export function biasOf(matrix: ConfusionMatrix): Bias {
  let over = 0;
  let under = 0;

  for (const [declared, row] of Object.entries(matrix)) {
    if (declared === "good") continue;
    const claimed = RANK[declared as Exclude<DeclaredSeverity, "good">];
    for (const [label, count] of Object.entries(row)) {
      const measured = RANK[label as MeasuredLabel];
      if (claimed > measured) over += count;
      else if (claimed < measured) under += count;
      // Equal ranks are an agreement — and `sound` against `none` is one of them.
    }
  }

  return { over, under, direction: leaning(over, under) };
}

/**
 * Which way it leans, or nothing. **Nothing is a legitimate answer**, twice over:
 * on too small a sample, and on divergences that balance. A screen that always
 * produces a sentence produces a false one whenever there is none to make.
 */
function leaning(over: number, under: number): Bias["direction"] {
  if (over + under < ENOUGH_TO_LEAN) return null;
  if (over === under) return null;
  return over > under ? "over" : "under";
}
