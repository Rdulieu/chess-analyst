import express, { type Express } from "express";
import type { Db } from "./db";
import type { ChessComClient } from "./chesscom";
import { type Engine, createFixtureEngine } from "./engine";
import { createAnalysisJob } from "./analysis/job";
import { createImportJob } from "./import";
import { createGamesRouter } from "./routes/games";
import { createProfilesRouter } from "./routes/profiles";
import { createImportRouter } from "./routes/import";
import { createAnalyzeRouter } from "./routes/analyze";
import { createSettingsRouter } from "./routes/settings";
import { createMoveHabitsRouter } from "./routes/move-habits";
import { createStatsRouter } from "./routes/stats";
import { createOpeningsRouter } from "./routes/openings";
import { createDangerRouter } from "./routes/danger";

/**
 * Builds the local API server over an already-open database and a chess.com
 * client (ADR-0002: this relay is the only thing that talks to chess.com). The
 * client is injected so tests and the agentic Feature Path can drive imports
 * against a fixture archive instead of the live API. The `Engine` is injected
 * the same way (ADR-0008) — a fixture fake by default, so tests and the Feature
 * Path never invoke the real Stockfish. Routes live per feature under ./routes;
 * this file just wires them.
 */
export function createApp(
  db: Db,
  chessCom: ChessComClient,
  engine: Engine = createFixtureEngine(),
): Express {
  const analysisJob = createAnalysisJob(db, engine);
  const importJob = createImportJob(db, chessCom);
  const app = express();
  app.use(express.json());
  app.use("/api/profiles", createProfilesRouter(db, chessCom));
  app.use("/api/games", createGamesRouter(db));
  app.use("/api/import", createImportRouter(importJob, chessCom));
  app.use("/api/analyze", createAnalyzeRouter(analysisJob));
  app.use("/api/settings", createSettingsRouter(db));
  app.use("/api/move-habits", createMoveHabitsRouter(db));
  app.use("/api/stats", createStatsRouter(db));
  app.use("/api/openings", createOpeningsRouter(db));
  app.use("/api/danger", createDangerRouter(db));
  return app;
}
