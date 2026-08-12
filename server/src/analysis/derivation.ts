import type { Game } from "../db/schema";
import { gamePositions } from "../chess/positions";
import { winningChances, type CpOrMate } from "../danger/winning-chances";
import { classifyMove, type MoveSeverity } from "../danger/move-quality";

/** One half-move's annotation (US-7): the `Evaluation` and win% converted to
 *  White-relative (CONTEXT.md — stored values are side-to-move relative), and
 *  the Move's severity that led to this Position (`null` for ply 0 and for
 *  the opponent's Moves — CONTEXT.md: severities are Player-only). */
export interface MoveAnnotation {
  ply: number;
  whiteEval: CpOrMate;
  whiteWinChances: number;
  severity: MoveSeverity | null;
}

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
  game: Pick<Game, "pgn">,
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

/** Who is to move at the given ply index (ply 0 = start, White to move). */
function moverAt(ply: number): Game["playerColor"] {
  return ply % 2 === 0 ? "white" : "black";
}

/** Converts a side-to-move-relative `Evaluation` to White-relative (CONTEXT.md),
 *  always as a clean `{cp, mate}` pair — never the stored row as-is (which may
 *  carry other columns, e.g. `gameId`). */
function toWhiteRelative(evaluation: CpOrMate, mover: Game["playerColor"]): CpOrMate {
  const flip = mover === "black";
  return {
    cp: evaluation.cp === null ? null : flip ? -evaluation.cp : evaluation.cp,
    mate: evaluation.mate === null ? null : flip ? -evaluation.mate : evaluation.mate,
  };
}

/**
 * Every half-move of a Game annotated for display (US-7): the White-relative
 * `Evaluation`/win% for its resulting Position, and — for the Player's own
 * Moves only — the severity that led to it. Index-aligned with `gamePlies`
 * (ply 0 = starting Position), so a client's own navigation index maps
 * directly onto this array with no off-by-one.
 */
export function gameAnnotations(
  game: Pick<Game, "pgn" | "playerColor">,
  evals: { ply: number; cp: number | null; mate: number | null }[],
): MoveAnnotation[] {
  const plies = gamePlies(game, evals);
  const severities = moveSeverities(plies, game.playerColor);

  return plies.map((ply, i) => {
    const mover = moverAt(i);
    return {
      ply: i,
      whiteEval: toWhiteRelative(ply.evaluation, mover),
      whiteWinChances: mover === "white" ? ply.winChances : 100 - ply.winChances,
      severity: i === 0 ? null : severities[i - 1],
    };
  });
}
