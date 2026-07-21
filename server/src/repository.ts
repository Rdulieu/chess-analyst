import { eq } from "drizzle-orm";
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

/** Every retained Game. For US-1 this returns exactly one: the fixture. */
export function listGames(db: Db): Game[] {
  return db.select().from(games).all();
}

/** A single Game's full detail, or undefined when no Game has that id. */
export function getGame(db: Db, id: number): Game | undefined {
  return db.select().from(games).where(eq(games.id, id)).get();
}

/** Whether a Game with this chess.com URL is already retained (Import dedup). */
export function gameExistsByUrl(db: Db, gameUrl: string): boolean {
  return db.select({ id: games.id }).from(games).where(eq(games.gameUrl, gameUrl)).get() !== undefined;
}
