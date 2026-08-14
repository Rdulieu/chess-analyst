import { and, eq } from "drizzle-orm";
import { games, evaluations } from "./schema";
import { gamePositions } from "../chess/positions";
import type { Db } from "./index";

/**
 * Fills in the FEN of `Evaluation`s stored before the column existed (ADR-0012)
 * — they carry the migration's empty-string sentinel. Run at open, right after
 * the migrations, because ADR-0003 already makes launch the place where the
 * database is brought up to date with no manual step.
 *
 * **Repair, not re-analysis**: FENs are recoverable from the PGN in seconds,
 * where a Stockfish pass costs minutes — the dev-phase "re-import is cheap"
 * rule does not transfer to this table. **Idempotent**: once every row has its
 * FEN there is nothing left to select, so a second launch does no work.
 *
 * A Game whose PGN cannot be replayed loses its `Evaluation`s and reverts to
 * not-analyzed: losing engine work is acceptable in dev phase, serving wrong
 * FENs is not.
 *
 * @returns how many `Evaluation` rows were repaired.
 */
export function repairMissingFens(db: Db): number {
  const broken = db
    .select({ gameId: evaluations.gameId })
    .from(evaluations)
    .where(eq(evaluations.fen, ""))
    .all();
  const gameIds = [...new Set(broken.map((row) => row.gameId))];

  let repaired = 0;
  for (const gameId of gameIds) {
    const game = db.select().from(games).where(eq(games.id, gameId)).get();
    if (!game) continue;

    let fens: string[];
    try {
      fens = gamePositions(game.pgn);
    } catch {
      db.delete(evaluations).where(eq(evaluations.gameId, gameId)).run();
      db.update(games).set({ analyzed: false }).where(eq(games.id, gameId)).run();
      continue;
    }

    for (const [ply, fen] of fens.entries()) {
      const { changes } = db
        .update(evaluations)
        .set({ fen })
        .where(and(eq(evaluations.gameId, gameId), eq(evaluations.ply, ply), eq(evaluations.fen, "")))
        .run();
      repaired += changes;
    }

    // Anything still empty is a row the replay has no Position for — a ply past
    // the Game's last one. It describes no Position, so it is dropped rather
    // than left behind: otherwise the repair would find it again, and re-replay
    // this Game's PGN, on every single launch.
    db.delete(evaluations)
      .where(and(eq(evaluations.gameId, gameId), eq(evaluations.fen, "")))
      .run();
  }

  return repaired;
}
