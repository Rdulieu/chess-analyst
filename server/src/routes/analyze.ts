import { Router } from "express";
import type { AnalysisJob } from "../analysis/job";

/**
 * Analysis-pass routes (mounted at /api/analyze). `POST /` starts a background
 * pass over the not-yet-analyzed among the given `gameIds` and returns 202
 * immediately (the pass runs in the background); `GET /status` reports the
 * determinate progress the client polls.
 */
export function createAnalyzeRouter(job: AnalysisJob): Router {
  const router = Router();

  router.post("/", (req, res) => {
    const gameIds = Array.isArray(req.body?.gameIds)
      ? req.body.gameIds.filter((id: unknown): id is number => Number.isInteger(id))
      : [];
    res.status(202).json(job.start(gameIds));
  });

  router.get("/status", (_req, res) => {
    res.json(job.status());
  });

  return router;
}
