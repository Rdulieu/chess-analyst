import type { Db } from "./db";
import { games } from "./db/schema";
import { listGames } from "./repository";
import { FIXTURE_GAME } from "./fixture";

/**
 * Inserts the fixture Game the first time the app runs against an empty
 * database, so there is something real to display before chess.com import
 * (US-2) exists. Idempotent: does nothing once any Game is present.
 */
export function seedFixtureIfEmpty(db: Db): void {
  if (listGames(db).length > 0) return;
  db.insert(games).values(FIXTURE_GAME).run();
}
