import { Router } from "express";
import type { Db } from "../db";
import { getStats } from "../stats/repository";
import { scopedProfile } from "./scope";

/**
 * Read route for the global stats page (mounted at /api/stats).
 * `GET /?profileId=` returns **that Profile's** results summary (total + per
 * cadence + per side), aggregated on the fly from its Games (ADR-0014).
 */
export function createStatsRouter(db: Db): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    res.json(getStats(db, profile.id));
  });

  return router;
}
