import { Router } from "express";
import type { Db } from "../db";
import { listGames, getGame } from "../repository";

/** Read routes for retained Games (mounted at /api/games). */
export function createGamesRouter(db: Db): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(listGames(db));
  });

  router.get("/:id", (req, res) => {
    const id = Number(req.params.id);
    const game = Number.isInteger(id) ? getGame(db, id) : undefined;
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    res.json(game);
  });

  return router;
}
