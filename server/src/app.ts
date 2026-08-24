import express, { type Express } from "express";
import type { Db } from "./db";
import type { PlatformRegistry } from "./platform";
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
import { createPersonalRouter } from "./routes/personal";

/**
 * Builds the local API server over an already-open database and a **registry of
 * `PlatformClient`s**, one per supported Platform (ADR-0002: this relay is the
 * only thing that talks to the outside; ADR-0018: each adapter answers in our
 * vocabulary). The clients are injected so tests and the agentic Feature Path
 * can drive imports against a fixture archive instead of the live API, and the
 * one an Import uses is resolved from its `Profile`'s Platform. The `Engine` is
 * injected the same way (ADR-0008) — a fixture fake by default, so tests and the Feature
 * Path never invoke the real Stockfish. Routes live per feature under ./routes;
 * this file just wires them.
 */
export function createApp(
  db: Db,
  clients: PlatformRegistry,
  engine: Engine = createFixtureEngine(),
): Express {
  const analysisJob = createAnalysisJob(db, engine);
  const importJob = createImportJob(db, clients);
  const app = express();
  app.use(express.json());
  app.use("/api/profiles", createProfilesRouter(db, clients));
  app.use("/api/games", createGamesRouter(db));
  app.use("/api/import", createImportRouter(db, importJob));
  app.use("/api/analyze", createAnalyzeRouter(db, analysisJob));
  app.use("/api/settings", createSettingsRouter(db));
  app.use("/api/move-habits", createMoveHabitsRouter(db));
  app.use("/api/stats", createStatsRouter(db));
  app.use("/api/openings", createOpeningsRouter(db));
  app.use("/api/danger", createDangerRouter(db));
  app.use("/api/personal", createPersonalRouter(db));
  return app;
}
