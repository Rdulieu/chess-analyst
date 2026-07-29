import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { games, evaluations } from "../db/schema";
import { gamePlies, moveSeverities } from "../analysis/derivation";

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
