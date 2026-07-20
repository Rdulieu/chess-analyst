import { eq } from "drizzle-orm";
import type { Db } from "./db";
import { games, type Game } from "./db/schema";

/** Every retained Game. For US-1 this returns exactly one: the fixture. */
export function listGames(db: Db): Game[] {
  return db.select().from(games).all();
}

/** A single Game's full detail, or undefined when no Game has that id. */
export function getGame(db: Db, id: number): Game | undefined {
  return db.select().from(games).where(eq(games.id, id)).get();
}
