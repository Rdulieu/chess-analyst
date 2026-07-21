import express, { type Express } from "express";
import type { Db } from "./db";
import { listGames, getGame } from "./repository";
import { importMonth, UnknownUsernameError } from "./import";
import type { ChessComClient } from "./chesscom";

/**
 * Builds the local API server over an already-open database and a chess.com
 * client (ADR-0002: this relay is the only thing that talks to chess.com). The
 * client is injected so tests and the agentic Feature Path can drive imports
 * against a fixture archive instead of the live API.
 */
export function createApp(db: Db, chessCom: ChessComClient): Express {
  const app = express();
  app.use(express.json());

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

  app.post("/api/import", async (req, res) => {
    const { username, year, month, categories } = req.body ?? {};
    try {
      const result = await importMonth(db, chessCom, { username, year, month, categories });
      res.json(result);
    } catch (err) {
      if (err instanceof UnknownUsernameError) {
        res.status(404).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  return app;
}
