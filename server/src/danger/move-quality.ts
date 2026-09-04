export type MoveSeverity = "inaccuracy" | "mistake" | "blunder";

/**
 * The smallest **drop** this app is willing to call a fault (CONTEXT.md
 * `Inaccuracy`) — a distance between two Positions, never a level.
 *
 * It used to be the `Counted Move` floor as well, on the argument that a
 * Position with less than this left to lose could not produce a flagged Move at
 * all. That argument held only while the two numbers were the **same** number.
 * They are named apart now (`DECIDED_FLOOR`, beside the denominator it belongs
 * to) precisely so that retuning one cannot silently move the other: a drop and
 * a level answer different questions, and nothing says they must agree.
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
