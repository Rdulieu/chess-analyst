import { Router } from "express";
import type { Db } from "../db";
import { getStats } from "../stats/repository";

/**
 * Read route for the global stats page (mounted at /api/stats).
 * `GET /` returns the history-wide results summary (total + per cadence + per
 * side), aggregated on the fly from the retained Games.
 */
export function createStatsRouter(db: Db): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(getStats(db));
  });

  return router;
}
