import type { MoveReading } from "../../types";

/**
 * **Where the Player and the engine part company**, and in which direction —
 * the marks the `Confrontation`'s curve carries (US-26, ADR-0033).
 *
 * The curve carries **only** these. The engine's severity glyphs are not on it,
 * and that is a decision rather than an omission: the curve already draws the
 * engine's reading *by its shape*, so putting its verdicts on it a second time
 * would say nothing new and would drown the handful of marks that do. A Player
 * scanning sixty plies for their disagreements should meet a handful, not a
 * mark on every fault.
 *
 * **Two shapes, not two colours.** Over-reading danger and under-reading it are
 * opposite faults of analysis, and no rate separates them — so the axis of the
 * Game is where the direction of a bias becomes visible. The shapes carry it
 * (ADR-0013): a reader who sees no colour still reads the lean.
 */
export interface Divergence {
  ply: number;
  direction: "sous-lecture" | "sur-lecture";
}

/**
 * The glyph for each direction, chosen so the two differ **in form** and not
 * merely in hue.
 *
 * `▼` for under-reading: the Player placed the danger *below* what was
 * measured. `▲` for over-reading: above. The arrow points the way the Player's
 * verdict sat relative to the engine's, which is the one mnemonic that does not
 * have to be learnt from a legend — and there is no legend on this screen.
 */
export const DIVERGENCE_GLYPH: Record<Divergence["direction"], string> = {
  "sous-lecture": "▼",
  "sur-lecture": "▲",
};

/** What each direction is called, for the mark's accessible name. */
export const DIVERGENCE_LABEL: Record<Divergence["direction"], string> = {
  "sous-lecture": "sous-lecture",
  "sur-lecture": "sur-lecture",
};

/**
 * The divergences of one reading, in ply order.
 *
 * Agreements are absent by construction, and so is everything unscored: a Move
 * nothing scores cannot be a disagreement, and marking a forced catastrophe as
 * one would put the story's central case on the curve as a fault of the
 * Player's.
 */
export function divergencesOf(moves: MoveReading[]): Divergence[] {
  return moves
    .filter(
      (move): move is MoveReading & { term: Divergence["direction"] } =>
        move.term === "sous-lecture" || move.term === "sur-lecture",
    )
    .map((move) => ({ ply: move.ply, direction: move.term }));
}
