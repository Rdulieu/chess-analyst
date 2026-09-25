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

  // `async`, because the `Material signature` table folds every Game of the
  // Profile and replays the PGN of the unanalysed ones — tens of seconds on a
  // large history. `getStats` yields between batches so this route is a slow
  // answer rather than a server that answers nothing (ADR-0012's lesson, one
  // route over).
  router.get("/", async (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    res.json(await getStats(db, profile.id));
  });

  return router;
}
