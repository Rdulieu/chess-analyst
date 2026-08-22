import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { games, evaluations, analysisPasses } from "../db/schema";
import type { SearchRegime } from "../engine/types";
import { gameAnnotations, type MoveAnnotation } from "../analysis/derivation";
import { gameRecap, type GameRecap } from "../analysis/recap";

export interface GameAnnotations {
  analyzed: boolean;
  plies: MoveAnnotation[];
  /**
   * The `Search regime` this Game was analyzed under (CONTEXT.md) — uniform per
   * Game by construction, since a Game whose Evaluations came from another
   * regime is re-evaluated whole. `null` when the Game is not analyzed, or when
   * its Evaluations name no pass: unknown provenance is said to be unknown
   * rather than assumed to be today's regime.
   */
  regime: SearchRegime | null;
  /**
   * What this Game contributes to the analysis (ADR-0017) — served beside the
   * per-Move records because it is **the same derivation**, not a summary of the
   * page's own making. `null` when the Game is not analyzed.
   */
  recap: GameRecap | null;
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
  if (!game.analyzed) return { analyzed: false, plies: [], regime: null, recap: null };

  const evals = db.select().from(evaluations).where(eq(evaluations.gameId, gameId)).all();
  const regime = gameRegime(db, gameId);
  return {
    analyzed: true,
    plies: gameAnnotations(game, evals),
    regime,
    recap: gameRecap(game, evals, regime),
  };
}

/**
 * The `Search regime` a Game's stored `Evaluation`s were produced under, read
 * back through the pass that wrote them. One regime per Game by construction
 * (`analyzeGame` re-evaluates a Game whole rather than mixing two), so the first
 * row's pass speaks for all of them.
 */
function gameRegime(db: Db, gameId: number): SearchRegime | null {
  const pass = db
    .select({ depth: analysisPasses.depth, lines: analysisPasses.lines })
    .from(evaluations)
    .innerJoin(analysisPasses, eq(evaluations.passId, analysisPasses.id))
    .where(eq(evaluations.gameId, gameId))
    .get();
  return pass ?? null;
}
