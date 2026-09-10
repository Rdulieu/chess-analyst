/**
 * How a **distance** and a **cost** are said on the `Confrontation` screen.
 *
 * Two lines of vocabulary, in one place, because they are now said twice: by
 * the aggregate block's list of misses, and by the per-Move `◆` cartouche
 * US-26 added. The wording is the argument — *"your marker is on 21.Rd1, which
 * cost nothing; the loss is on 22.Nxe5, one half-move further"* teaches where
 * to have looked, where a silent partial credit would teach nothing and hide
 * the miss. Two copies of that sentence would drift, and the day they did the
 * screen would say two different things about the same marker.
 */

/** Points of winning chances, as they are written everywhere else in the app. */
export function points(value: number): string {
  return `${Math.round(value)} points`;
}

/**
 * The gap between two plies, in half-moves and in words.
 *
 * Half-moves rather than Moves because that is the unit the marker was placed
 * in: rounding to whole Moves would make a marker one ply away and one three
 * plies away read as the same near miss, which is exactly the distinction the
 * sentence exists to draw.
 */
export function halfMoveGap(from: number, to: number): string {
  const gap = Math.abs(to - from);
  return gap === 1 ? "un demi-coup" : `${gap} demi-coups`;
}
