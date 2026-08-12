import { eq, count } from "drizzle-orm";
import type { Db } from "../db";
import { games, evaluations, type Game } from "../db/schema";
import { ANALYSIS_DEPTH, type Engine } from "../engine/types";
import { gamePositions } from "../chess/positions";

/**
 * Runs the engine analysis pass over one Game (ADR-0009): evaluate **every**
 * Position — the initial one (`ply` 0) and the Position after each half-move
 * (`ply` N) — and store one raw `Evaluation` per Position. Evaluating every
 * Position is required because a Move's quality (derived in slice B) is the drop
 * between its Position's eval and the next Position's, i.e. two consecutive plies.
 *
 * Idempotent per Game (twin of `recordMoveHabits`, ADR-0005): a Game already
 * flagged `analyzed` is skipped, and the flag is set once the pass is done, so
 * an already-analyzed Game is never re-evaluated and its Evaluations are never
 * double-stored — whichever entry point calls this.
 */
export async function analyzeGame(db: Db, engine: Engine, game: Game): Promise<void> {
  // Read the flag from the store, not the passed row: a caller may hand us a
  // stale object (flag still false in memory) after a prior run already set it.
  const done = db
    .select({ analyzed: games.analyzed })
    .from(games)
    .where(eq(games.id, game.id))
    .get()?.analyzed;
  if (done) return;

  // A pass cut short (shutdown, engine failure) leaves Evaluations behind
  // *without* the flag. Resume at the first Position still missing rather than
  // colliding on the rows already stored: Evaluations are retained and never
  // recomputed (CONTEXT.md, `Analysis pass`), so no engine time is spent twice.
  const stored =
    db.select({ n: count() }).from(evaluations).where(eq(evaluations.gameId, game.id)).get()?.n ?? 0;

  const fens = gamePositions(game.pgn);
  for (let ply = stored; ply < fens.length; ply++) {
    const { cp, mate } = await engine.evaluate(fens[ply], ANALYSIS_DEPTH);
    db.insert(evaluations).values({ gameId: game.id, ply, cp, mate }).run();
  }

  db.update(games).set({ analyzed: true }).where(eq(games.id, game.id)).run();
}
