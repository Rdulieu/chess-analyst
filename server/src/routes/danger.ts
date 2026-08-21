import { Router } from "express";
import type { Db } from "../db";
import { countAnalyzedGames, getDangerPositions } from "../danger/repository";
import { scopedProfile } from "./scope";

/**
 * Read route for the `Danger position` view (mounted at /api/danger). Derived
 * on the fly from analyzed Games' stored `Evaluation`s (ADR-0009) — no engine
 * call on this path.
 */
export function createDangerRouter(db: Db): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    res.json({
      dangers: getDangerPositions(db, profile.id),
      analyzedGames: countAnalyzedGames(db, profile.id),
    });
  });

  return router;
}
