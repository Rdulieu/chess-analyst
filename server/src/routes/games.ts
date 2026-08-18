import { Router } from "express";
import type { Db } from "../db";
import { listGames, getGame } from "../repository";
import { getGameAnnotations } from "../annotations/repository";
import { scopedProfile } from "./scope";

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
    res.json(listGames(db, profile.id));
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

  router.get("/:id/annotations", (req, res) => {
    const id = Number(req.params.id);
    const annotations = Number.isInteger(id) ? getGameAnnotations(db, id) : undefined;
    if (!annotations) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    res.json(annotations);
  });

  return router;
}
