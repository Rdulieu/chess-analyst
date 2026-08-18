import { Router } from "express";
import type { Db } from "../db";
import { getWeakOpenings } from "../openings/repository";
import { scopedProfile } from "./scope";

/**
 * Read route for the `Weak opening` page (mounted at /api/openings).
 * `GET /?profileId=` returns **that Profile's** `Weak opening` entries — one per
 * (opening, side, cadence), sorted by game count descending — aggregated on the
 * fly from its Games (ADR-0007, ADR-0014).
 */
export function createOpeningsRouter(db: Db): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    res.json({ openings: getWeakOpenings(db, profile.id) });
  });

  return router;
}
