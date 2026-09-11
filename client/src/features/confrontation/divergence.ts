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

/**
 * The mark's tint and ink on the curve — **the cartouche's own pair, per
 * direction**, so the drawing and the label of one divergence are the same
 * colour (requester, 2026-09-11). A `Sous-lecture` is red on the curve because
 * it is red in the cartouche; a `Sur-lecture` is yellow in both. A reader who
 * spots a mark and walks to it must not meet a different colour on arrival.
 *
 * **A pair, and not a single ink**, because a mark here **straddles two
 * grounds**: White's share below it is a theme-invariant light fill, the region
 * above follows the theme. Left to inherit, a glyph measured **1.04:1** against
 * the fill in dark and three of five disappeared into the drawing. The tint
 * carries it over one ground and the border — `currentColor`, so this ink —
 * over the other, which is exactly the bargain the engine's severity markers
 * already make.
 *
 * These are the **semantic** tints, which follow the theme. That is right for
 * something nothing is painted on top of, and it is what keeps the pairing with
 * the cartouche true in both themes rather than only in one.
 */
export const DIVERGENCE_TINT: Record<Divergence["direction"], string> = {
  "sous-lecture": "var(--tint-fail)",
  "sur-lecture": "var(--tint-inaccuracy)",
};

export const DIVERGENCE_INK: Record<Divergence["direction"], string> = {
  "sous-lecture": "var(--tint-fail-ink)",
  "sur-lecture": "var(--tint-inaccuracy-ink)",
};

/**
 * What each direction is called **out loud** — the mark's accessible name.
 *
 * It names the term *and* says what it means, because the term alone would be
 * vocabulary the screen never shows: the cartouches speak of « Bévue ratée »
 * and « Bévue surestimée », and a reader who only hears "sous-lecture" would
 * be given a word with nothing to attach it to. `Sous-lecture` and
 * `Sur-lecture` are the project's own terms (CONTEXT.md), so they are kept —
 * and explained.
 */
export const DIVERGENCE_LABEL: Record<Divergence["direction"], string> = {
  "sous-lecture": "sous-lecture : le danger était plus grand que vous ne l'aviez dit",
  "sur-lecture": "sur-lecture : le danger était plus petit que vous ne l'aviez dit",
};

/**
 * The divergence of one Move, or `null`. The narrowing lives here, beside the
 * type it narrows, so a caller reading the list and a caller reading the curve
 * cannot disagree about what counts as a disagreement.
 */
export function divergenceAt(move: MoveReading | undefined): Divergence["direction"] | null {
  if (move?.term === "sous-lecture" || move?.term === "sur-lecture") return move.term;
  return null;
}

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
