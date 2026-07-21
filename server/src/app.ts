import express, { type Express } from "express";
import type { Db } from "./db";
import { listGames, getGame } from "./repository";

/**
 * Builds the local API server over an already-open database. The frontend
 * fetches Games through these endpoints rather than hardcoding them, so US-2
 * can add real Games without the frontend's data-fetching code changing.
 *
 * There are deliberately no chess.com calls here — that relay is US-2's job.
 */
export function createApp(db: Db): Express {
  const app = express();

  app.get("/api/games", (_req, res) => {
    res.json(listGames(db));
  });

  app.get("/api/games/:id", (req, res) => {
    const id = Number(req.params.id);
    const game = Number.isInteger(id) ? getGame(db, id) : undefined;
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    res.json(game);
  });

  return app;
}
