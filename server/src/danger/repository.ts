import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { games, evaluations, type Game } from "../db/schema";
import { gamePositions } from "../chess/positions";
import { winningChances } from "./winning-chances";
import { classifyMove, type MoveSeverity } from "./move-quality";

export interface DangerEntry {
  fen: string;
  reached: number;
  seriousErrors: number;
  proportion: number;
}

/** How far ahead (in half-moves) a reach looks for a serious error (ADR-0009: tunable). */
const LOOKAHEAD_PLIES = 10;

/** The 4-field FEN identity `Danger position` shares with `Move habit` (CONTEXT.md). */
function fourFieldFen(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

interface Ply {
  fen: string;
  /** Winning chances (0–100) for whoever is to move at this Position. */
  winChances: number;
}

/** One analyzed Game's per-Position FENs and win% (ply 0 = initial Position). */
function gamePlies(game: Game, evals: { ply: number; cp: number | null; mate: number | null }[]): Ply[] {
  const fens = gamePositions(game.pgn);
  const evalByPly = new Map(evals.map((e) => [e.ply, e]));
  return fens.map((fen, ply) => ({ fen, winChances: winningChances(evalByPly.get(ply)!) }));
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
function moveSeverities(plies: Ply[], playerColor: Game["playerColor"]): (MoveSeverity | null)[] {
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

/**
 * `Danger position`s (CONTEXT.md), derived on the fly from analyzed Games'
 * stored per-ply `Evaluation`s (ADR-0009 — no engine call, no stored
 * aggregate). Every reached Position counts (the FEN's active-colour field
 * already separates whose turn it was — not scoped by side or cadence);
 * transpositions merge across every analyzed Game via the 4-field FEN.
 */
export function getDangerPositions(db: Db): DangerEntry[] {
  const analyzedGames = db.select().from(games).where(eq(games.analyzed, true)).all();

  const reached = new Map<string, number>();
  const seriousErrorReaches = new Map<string, number>();

  for (const game of analyzedGames) {
    const evals = db.select().from(evaluations).where(eq(evaluations.gameId, game.id)).all();
    const plies = gamePlies(game, evals);
    const severities = moveSeverities(plies, game.playerColor);

    for (let i = 0; i < plies.length; i++) {
      const key = fourFieldFen(plies[i].fen);
      reached.set(key, (reached.get(key) ?? 0) + 1);

      const windowEnd = Math.min(i + LOOKAHEAD_PLIES, severities.length);
      let serious = false;
      for (let j = i; j < windowEnd; j++) {
        if (severities[j] === "mistake" || severities[j] === "blunder") {
          serious = true;
          break;
        }
      }
      if (serious) seriousErrorReaches.set(key, (seriousErrorReaches.get(key) ?? 0) + 1);
    }
  }

  return [...reached.entries()]
    .map(([fen, count]) => ({
      fen,
      reached: count,
      seriousErrors: seriousErrorReaches.get(fen) ?? 0,
      proportion: (seriousErrorReaches.get(fen) ?? 0) / count,
    }))
    .sort((a, b) => b.reached - a.reached);
}
