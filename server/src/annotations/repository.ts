import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { games, evaluations } from "../db/schema";
import { gameAnnotations, type MoveAnnotation } from "../analysis/derivation";

export interface GameAnnotations {
  analyzed: boolean;
  plies: MoveAnnotation[];
}

/**
 * Per-Move annotations for a single Game (US-7): the White-relative
 * `Evaluation` and severity for every half-move, derived on the fly from
 * US-4's stored `evaluations` (no engine call). `undefined` when no Game has
 * this id; `{ analyzed: false, plies: [] }` — never a silent empty analyzed
 * result — when the Game exists but hasn't been through the analysis pass.
 */
export function getGameAnnotations(db: Db, gameId: number): GameAnnotations | undefined {
  const game = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game) return undefined;
  if (!game.analyzed) return { analyzed: false, plies: [] };

  const evals = db.select().from(evaluations).where(eq(evaluations.gameId, gameId)).all();
  return { analyzed: true, plies: gameAnnotations(game, evals) };
}
