export type MoveSeverity = "inaccuracy" | "mistake" | "blunder";

/**
 * The smallest drop this app is willing to call a fault (CONTEXT.md
 * `Inaccuracy`). Exported because it is also the **`Counted Move`** floor: a
 * Position with less than this left to lose cannot structurally produce a
 * flagged Move, so a Move played there can say nothing about the Player. One
 * published threshold, read in both places — not a second one that happens to
 * agree.
 */
export const INACCURACY_DROP = 10;

/**
 * The Player-relative winning-chances drop for one of their own Moves —
 * `winBefore` from the Position before it (best play), `winAfter` from the
 * Position after (Move actually played), both already Player-relative
 * (CONTEXT.md `Inaccuracy`/`Mistake`/`Blunder`). A drop under 10% is not
 * flagged — this also covers a weak Move played while already (near-)winning
 * or lost: winning chances saturate near the extremes, so the drop stays
 * small regardless of the underlying centipawn swing.
 */
export function classifyMove(winBefore: number, winAfter: number): MoveSeverity | null {
  const drop = winBefore - winAfter;
  if (drop >= 30) return "blunder";
  if (drop >= 20) return "mistake";
  if (drop >= INACCURACY_DROP) return "inaccuracy";
  return null;
}
