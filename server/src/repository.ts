import { and, desc, eq } from "drizzle-orm";
import type { Db } from "./db";
import { games, settings, type Game } from "./db/schema";

const USERNAME_KEY = "chesscom_username";

/** The stored chess.com username of the Player, or undefined if never set. */
export function getPlayerUsername(db: Db): string | undefined {
  return db.select().from(settings).where(eq(settings.key, USERNAME_KEY)).get()?.value;
}

/** Stores (or replaces) the Player's chess.com username. */
export function setPlayerUsername(db: Db, username: string): void {
  db.insert(settings)
    .values({ key: USERNAME_KEY, value: username })
    .onConflictDoUpdate({ target: settings.key, set: { value: username } })
    .run();
}

/**
 * The Games of **one `Profile`** (ADR-0014). There is deliberately no way to
 * ask for "every Game": a list spanning two Profiles would be one player's
 * history with another's mixed in, and nothing in the rows would say so.
 *
 * **Most recent first**, and the order belongs HERE rather than to a screen: the
 * Player thinks of a history as running backwards from today, so that is a
 * property of the Game list itself, not a way of laying one out. Every consumer
 * of the list inherits it without asking.
 *
 * `date` is an ISO day (`YYYY-MM-DD`), so a lexicographic sort IS the
 * chronological one — no parsing, and the index on the column can serve it. The
 * day carries no time, so several Games a day are a real tie; `id` breaks it,
 * the most recently retained first, which is the only chronological signal left
 * once the clock is gone.
 */
export function listGames(db: Db, profileId: number): Game[] {
  return db
    .select()
    .from(games)
    .where(eq(games.profileId, profileId))
    .orderBy(desc(games.date), desc(games.id))
    .all();
}

/** A single Game's full detail, or undefined when no Game has that id. */
export function getGame(db: Db, id: number): Game | undefined {
  return db.select().from(games).where(eq(games.id, id)).get();
}

/** Whether a Game with this chess.com URL is already retained (Import dedup). */
export function gameExistsByUrl(db: Db, profileId: number, gameUrl: string): boolean {
  return (
    db
      .select({ id: games.id })
      .from(games)
      .where(and(eq(games.profileId, profileId), eq(games.gameUrl, gameUrl)))
      .get() !== undefined
  );
}
