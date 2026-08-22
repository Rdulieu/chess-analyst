import { Chess } from "cm-chess";
import type { MoveAnnotation } from "../types";

/** One ply of a `Best line`, as it is read on screen: the Move in notation, the
 *  squares it goes between, and the Position it leads to. */
export interface LinePly {
  san: string;
  /** The Position reached after this ply — what previewing it shows. */
  fen: string;
  from: string;
  to: string;
}

/**
 * How many plies of a `Best line` are **shown**. A depth-16 line can run fifteen
 * plies and its tail is engine noise rather than instruction, so the display
 * stops early — the rest of the line is still stored, and still there
 * (ADR-0016: the cap is a display choice, never a storage one).
 */
export const DISPLAYED_PLIES = 6;

/**
 * A stored `Best line` (UCI, whole) read as Moves from `fen`: their notation,
 * their squares, and the Position each one leads to. Replaying the first *k*
 * Moves of the line from the displayed Position is all a preview needs — **no
 * tree, no branch, no stored variation** (the variation navigation of US-16 is
 * deliberately not built here).
 *
 * Stops at the first Move that is not legal from the Position reached so far,
 * rather than showing a line that does not follow: a line kept against another
 * Position must read as nothing, not as a continuation of this one.
 */
export function readBestLine(fen: string, uci: string[], cap = DISPLAYED_PLIES): LinePly[] {
  const chess = new Chess({ fen });
  const line: LinePly[] = [];

  for (const move of uci.slice(0, cap)) {
    const played = chess.move({
      from: move.slice(0, 2),
      to: move.slice(2, 4),
      promotion: move.slice(4) || undefined,
    });
    if (!played || !played.from || !played.to) break;
    line.push({ san: played.san, fen: played.fen, from: played.from, to: played.to });
  }

  return line;
}

/**
 * What is known about the Move being reviewed: the two `Best line`s that explain
 * it, and the severity that makes it worth explaining. `null` when there is
 * nothing to report — the Position at the start of the Game, an opponent's Move,
 * or one of the Player's own Moves that the analysis does not flag.
 *
 * One function, so that the panel's text and the board's arrows can never
 * disagree about what the record *is*: they read the same lines.
 */
export interface ReviewedMove {
  severity: NonNullable<MoveAnnotation["severity"]>;
  /** The line of the Position **before** the Move: what should have been played. */
  shouldHavePlayed: LinePly[];
  /** The line of the Position **after** it: the opponent's best reply, and how the Move is punished. */
  refutation: LinePly[];
}

export function reviewedMove(
  annotations: MoveAnnotation[],
  index: number,
  positionBefore: string,
  positionAfter: string,
): ReviewedMove | null {
  const reviewed = index > 0 ? annotations[index] : undefined;
  if (!reviewed?.severity) return null;

  return {
    severity: reviewed.severity,
    shouldHavePlayed: readBestLine(positionBefore, annotations[index - 1]?.bestLine ?? []),
    refutation: readBestLine(positionAfter, reviewed.bestLine),
  };
}
