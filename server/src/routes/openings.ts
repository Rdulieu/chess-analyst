import { Router } from "express";
import type { Db } from "../db";
import { getWeakOpenings } from "../openings/repository";

/**
 * Read route for the `Weak opening` page (mounted at /api/openings).
 * `GET /` returns the `Weak opening` entries — one per (opening, side, cadence),
 * sorted by game count descending — aggregated on the fly from the retained
 * Games (ADR-0007).
 */
export function createOpeningsRouter(db: Db): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ openings: getWeakOpenings(db) });
  });

  return router;
}
