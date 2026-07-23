import { Chess } from "cm-chess";
import type { MoveHabitCandidate } from "../types";

/** A candidate Move drawn on the board: its arrow squares, colour, and SAN. */
export interface CandidateArrow {
  san: string;
  startSquare: string;
  endSquare: string;
  /** hsla: hue encodes win rate, alpha encodes frequency. */
  color: string;
}

const MIN_ALPHA = 0.3;

/**
 * The colour of a candidate's arrow. Hue runs red (0, losing) → green (120,
 * winning) by win rate, so it flips sides across the 50% threshold; alpha runs
 * from `MIN_ALPHA` (rare) to 1 (the most-played candidate), so frequent Moves
 * stand out. react-chessboard v5 supports per-arrow colour only (not width),
 * so frequency rides on the alpha channel rather than stroke thickness.
 */
function arrowColor(winRate: number, count: number, maxCount: number): string {
  const hue = Math.round(winRate * 120);
  const alpha = maxCount <= 0 ? 1 : Number((MIN_ALPHA + (1 - MIN_ALPHA) * (count / maxCount)).toFixed(2));
  return `hsla(${hue}, 70%, 45%, ${alpha})`;
}

/**
 * Board arrows for the candidate Moves shown at the current explorer level: one
 * arrow per candidate, from the moving piece's square to its target, coloured
 * by win rate (hue) and frequency (opacity). The current Position is reached by
 * replaying `path` from the start; a candidate whose SAN is not legal there is
 * skipped defensively.
 */
export function candidateArrows(
  path: string[],
  candidates: MoveHabitCandidate[],
): CandidateArrow[] {
  const chess = new Chess();
  for (const san of path) chess.move(san);

  const squaresBySan = new Map(chess.moves({ verbose: true }).map((m) => [m.san, m]));
  const maxCount = Math.max(0, ...candidates.map((c) => c.count));

  return candidates.flatMap((c) => {
    const move = squaresBySan.get(c.san);
    if (!move || !move.from || !move.to) return [];
    return [
      {
        san: c.san,
        startSquare: move.from,
        endSquare: move.to,
        color: arrowColor(c.winRate, c.count, maxCount),
      },
    ];
  });
}
