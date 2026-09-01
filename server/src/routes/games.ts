import { Router } from "express";
import type { Db } from "../db";
import { listGames } from "../repository";
import { getGameAnnotations } from "../annotations/repository";
import { readingState, readingStates } from "../personal/repository";
import { scopedProfile, scopedGame } from "./scope";

/**
 * Read routes for retained Games (mounted at /api/games). The list is **about
 * one `Profile`**, named by the request (ADR-0014); the per-Game routes name a
 * Game outright and need no scope to be unambiguous.
 */
export function createGamesRouter(db: Db): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    // The reading state travels **with** the Game, like `analyzed` does: showing
    // it on eighty rows must not cost eighty requests, and the list is already
    // the place this app hands over a Game's full detail.
    const states = readingStates(db, profile.id);
    res.json(
      listGames(db, profile.id).map((game) => ({
        ...game,
        reading: states.get(game.id) ?? "none",
      })),
    );
  });

  // Scoped like every other read (ADR-0014). It was not, and that was the one
  // hole in the partition: a Game fetched by id came back to whoever asked.
  router.get("/:id", (req, res) => {
    const game = scopedGame(db, req, res);
    if (!game) return;
    res.json({ ...game, reading: readingState(db, game.id) });
  });

  // Scoped too, and this is the one that mattered most: it serves what the
  // engine found, which is exactly what `/personal` guards two checks deep.
  router.get("/:id/annotations", (req, res) => {
    const game = scopedGame(db, req, res);
    if (!game) return;
    // The Game is vouched for, so the annotations cannot be absent.
    res.json(getGameAnnotations(db, game.id));
  });

  return router;
}
