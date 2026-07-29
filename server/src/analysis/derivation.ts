import type { Game } from "../db/schema";
import { gamePositions } from "../chess/positions";
import { winningChances, type CpOrMate } from "../danger/winning-chances";
import { classifyMove, type MoveSeverity } from "../danger/move-quality";

/** One analyzed Game's per-Position FEN, raw `Evaluation` and win% (ply 0 = initial Position). */
export interface Ply {
  fen: string;
  /** The raw stored `Evaluation`, side-to-move relative. */
  evaluation: CpOrMate;
  /** Winning chances (0–100) for whoever is to move at this Position. */
  winChances: number;
}

/** A Game's per-Position FENs, raw `Evaluation`s and win% (ply 0 = initial Position), shared by
 *  every feature deriving from US-4's stored `evaluations` (`Danger position`, US-7's per-Move
 *  annotations) — ADR-0009: no engine call, no stored aggregate, everything read at request time. */
export function gamePlies(
  game: Game,
  evals: { ply: number; cp: number | null; mate: number | null }[],
): Ply[] {
  const fens = gamePositions(game.pgn);
  const evalByPly = new Map(evals.map((e) => [e.ply, e]));
  return fens.map((fen, ply) => {
    const evaluation = evalByPly.get(ply)!;
    return { fen, evaluation, winChances: winningChances(evaluation) };
  });
}

/**
 * The severity of each half-move of the Game, Player-relative — `null` when
 * the half-move is not the Player's own (CONTEXT.md: severities are only ever
 * computed for the Player). `severities[i]` is the Move from `plies[i]` to
 * `plies[i + 1]`. The Position's `winChances` is already relative to whoever
 * is about to move there; the resulting Position's is relative to the
 * *opponent* (their turn next), so it is flipped (`100 -`) to stay
 * Player-relative for the drop.
 */
export function moveSeverities(plies: Ply[], playerColor: Game["playerColor"]): (MoveSeverity | null)[] {
  const severities: (MoveSeverity | null)[] = [];
  for (let i = 0; i < plies.length - 1; i++) {
    const mover = i % 2 === 0 ? "white" : "black";
    if (mover !== playerColor) {
      severities.push(null);
      continue;
    }
    severities.push(classifyMove(plies[i].winChances, 100 - plies[i + 1].winChances));
  }
  return severities;
}
