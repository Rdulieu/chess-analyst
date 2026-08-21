import { Chess } from "cm-chess";
import { eq, sql } from "drizzle-orm";
import type { Db } from "../db";
import { games, moveHabits, type Game } from "../db/schema";

/** Depth cap: 40 half-moves = 20 full moves (ADR-0005 / CONTEXT.md). */
const DEPTH_CAP = 40;

/**
 * The Position identity used as the Move habit key: the first four FEN fields
 * (placement, active colour, castling, en passant), dropping the halfmove and
 * fullmove counters so a Position reached by different move orders shares one
 * key and transpositions merge (ADR-0005).
 */
function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

const one = (cond: boolean) => (cond ? 1 : 0);

/**
 * Folds one Game's Moves into the pre-aggregated `Move habit` counters
 * (ADR-0005). Walks the Game up to the depth cap and, for every half-move —
 * the Player's own Moves and the opponent's replies alike — increments the
 * counter keyed by (Position played from, side the Player played, Move). Each
 * Move carries the Game's Player-relative result and time control.
 *
 * Idempotent per Game: a Game already flagged `moveHabitsComputed` is skipped,
 * and the flag is set once done, so the (non-idempotent) running totals count a
 * Game exactly once regardless of which entry point calls this.
 */
export function recordMoveHabits(db: Db, game: Game): void {
  // Read the flag from the store, not the passed row: a caller may hand us a
  // stale object (flag still false in memory) after a prior run already set it.
  const done = db
    .select({ computed: games.moveHabitsComputed })
    .from(games)
    .where(eq(games.id, game.id))
    .get()?.computed;
  if (done) return;

  const chess = new Chess();
  chess.loadPgn(game.pgn.trim());
  const plies = chess.history();

  let fenBefore = positionKey(chess.setUpFen());
  const limit = Math.min(plies.length, DEPTH_CAP);
  for (let i = 0; i < limit; i++) {
    const { san, fen } = plies[i];
    bumpCounter(db, fenBefore, game, san);
    fenBefore = positionKey(fen);
  }

  db.update(games).set({ moveHabitsComputed: true }).where(eq(games.id, game.id)).run();
}

function bumpCounter(db: Db, fen: string, game: Game, san: string): void {
  const delta = {
    count: 1,
    win: one(game.result === "win"),
    draw: one(game.result === "draw"),
    loss: one(game.result === "loss"),
    bullet: one(game.timeControlCategory === "bullet"),
    blitz: one(game.timeControlCategory === "blitz"),
    rapid: one(game.timeControlCategory === "rapid"),
    classical: one(game.timeControlCategory === "classical"),
    correspondence: one(game.timeControlCategory === "correspondence"),
  };
  db.insert(moveHabits)
    .values({ profileId: game.profileId, fen, side: game.playerColor, san, ...delta })
    .onConflictDoUpdate({
      // Keyed by the owner too (ADR-0014): the same Move from the same Position
      // is a different habit under a different Profile, never one shared total.
      target: [moveHabits.profileId, moveHabits.fen, moveHabits.side, moveHabits.san],
      set: {
        count: sql`${moveHabits.count} + ${delta.count}`,
        win: sql`${moveHabits.win} + ${delta.win}`,
        draw: sql`${moveHabits.draw} + ${delta.draw}`,
        loss: sql`${moveHabits.loss} + ${delta.loss}`,
        bullet: sql`${moveHabits.bullet} + ${delta.bullet}`,
        blitz: sql`${moveHabits.blitz} + ${delta.blitz}`,
        rapid: sql`${moveHabits.rapid} + ${delta.rapid}`,
        classical: sql`${moveHabits.classical} + ${delta.classical}`,
        correspondence: sql`${moveHabits.correspondence} + ${delta.correspondence}`,
      },
    })
    .run();
}
