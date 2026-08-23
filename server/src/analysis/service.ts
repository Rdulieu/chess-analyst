import { and, eq, count, ne, isNull, or } from "drizzle-orm";
import type { Db } from "../db";
import { games, evaluations, analysisPasses, type AnalysisPass, type Game } from "../db/schema";
import { type Engine } from "../engine/types";
import { gamePositions } from "../chess/positions";

/**
 * Runs the engine analysis pass over one Game (ADR-0009): evaluate **every**
 * Position — the initial one (`ply` 0) and the Position after each half-move
 * (`ply` N) — and store one raw `Evaluation` per Position. Evaluating every
 * Position is required because a Move's quality (derived in slice B) is the drop
 * between its Position's eval and the next Position's, i.e. two consecutive plies.
 *
 * Idempotent per Game (twin of `recordMoveHabits`, ADR-0005) **at one
 * `Search regime`**: a Game whose stored Evaluations were produced under
 * `pass`'s own regime is left alone, and the flag is set once the pass is done,
 * so no engine time is ever spent twice — whichever entry point calls this.
 *
 * The regime is what decides, and it is consulted **before** the `analyzed`
 * flag: a Game analyzed under another depth or another number of lines is
 * re-evaluated **whole**, its old Evaluations replaced rather than continued
 * (CONTEXT.md, `Search regime`). A `Drift` figure is a sum over every ply of a
 * Game, so mixing two regimes inside one Game would mix two confidences into a
 * single number. That check being first is the reason the flag no longer
 * short-circuits: it used to end the story before anything could look.
 */
export async function analyzeGame(
  db: Db,
  engine: Engine,
  game: Game,
  pass: Pick<AnalysisPass, "id" | "depth" | "lines">,
  /**
   * The Player explicitly asked for this Game to be analyzed **again** and
   * confirmed losing what is stored (US-15a 07). It is the one case where
   * spending engine time on an already-analyzed Game is right, so it goes
   * through the SAME re-evaluation the regime change uses — the whole Game
   * goes and is analyzed from ply 0 — rather than a second mechanism that
   * could leave half a Game behind.
   */
  { overwrite = false }: { overwrite?: boolean } = {},
): Promise<void> {
  // Evaluations this Game holds that `pass`'s regime cannot stand behind: rows
  // from a pass at another depth or another line count, and rows whose pass is
  // unknown (they predate the relation, or their pass row is gone) — provenance
  // that cannot be shown is provenance that cannot be trusted.
  const foreignRegime = db
    .select({ n: count() })
    .from(evaluations)
    .leftJoin(analysisPasses, eq(evaluations.passId, analysisPasses.id))
    .where(
      and(
        eq(evaluations.gameId, game.id),
        or(
          isNull(analysisPasses.id),
          ne(analysisPasses.depth, pass.depth),
          ne(analysisPasses.lines, pass.lines),
        ),
      ),
    )
    .get()?.n ?? 0;

  // A Game is never *partly* re-evaluated: the whole Game goes, and is analyzed
  // from ply 0. Half a Game at each of two regimes is the one state this must
  // never produce.
  if (foreignRegime > 0 || overwrite) {
    db.delete(evaluations).where(eq(evaluations.gameId, game.id)).run();
    db.update(games).set({ analyzed: false }).where(eq(games.id, game.id)).run();
  } else {
    // Read the flag from the store, not the passed row: a caller may hand us a
    // stale object (flag still false in memory) after a prior run already set it.
    const done = db
      .select({ analyzed: games.analyzed })
      .from(games)
      .where(eq(games.id, game.id))
      .get()?.analyzed;
    if (done) return;
  }

  // A pass cut short (shutdown, engine failure) leaves Evaluations behind
  // *without* the flag. Resume at the first Position still missing rather than
  // colliding on the rows already stored: Evaluations are retained and never
  // recomputed (CONTEXT.md, `Analysis pass`), so no engine time is spent twice.
  // At the **same** regime only — the block above has already cleared anything
  // that came from another.
  const stored =
    db.select({ n: count() }).from(evaluations).where(eq(evaluations.gameId, game.id)).get()?.n ?? 0;

  const fens = gamePositions(game.pgn);
  for (let ply = stored; ply < fens.length; ply++) {
    const fen = fens[ply];
    const { cp, mate, pv, second } = await engine.evaluate(fen, pass.depth);
    // The FEN is stored with the Evaluation it belongs to: the pass holds it in
    // hand anyway, and it is what spares every read path a PGN replay (ADR-0012).
    db.insert(evaluations)
      .values({
        gameId: game.id,
        ply,
        fen,
        cp,
        mate,
        // The `Best line` **whole**, in UCI, one space-separated column whose
        // head is the best move (ADR-0016): the engine printed it and we used to
        // drop it, which cost nothing to keep and everything to recompute.
        pv: pv.join(" "),
        cp2: second?.cp ?? null,
        mate2: second?.mate ?? null,
        // Which pass wrote the row, hence under which `Search regime`.
        passId: pass.id,
      })
      .run();
  }

  db.update(games).set({ analyzed: true }).where(eq(games.id, game.id)).run();
}
