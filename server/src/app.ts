import express, { type Express } from "express";
import type { Db } from "./db";
import type { ChessComClient } from "./chesscom";
import { createGamesRouter } from "./routes/games";
import { createImportRouter } from "./routes/import";
import { createSettingsRouter } from "./routes/settings";
import { createMoveHabitsRouter } from "./routes/move-habits";

/**
 * Builds the local API server over an already-open database and a chess.com
 * client (ADR-0002: this relay is the only thing that talks to chess.com). The
 * client is injected so tests and the agentic Feature Path can drive imports
 * against a fixture archive instead of the live API. Routes live per feature
 * under ./routes; this file just wires them.
 */
export function createApp(db: Db, chessCom: ChessComClient): Express {
  const app = express();
  app.use(express.json());
  app.use("/api/games", createGamesRouter(db));
  app.use("/api/import", createImportRouter(db, chessCom));
  app.use("/api/settings", createSettingsRouter(db));
  app.use("/api/move-habits", createMoveHabitsRouter(db));
  return app;
}
