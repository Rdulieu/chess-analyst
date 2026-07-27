import { Router } from "express";
import type { Db } from "../db";
import { getDangerPositions } from "../danger/repository";

/**
 * Read route for the `Danger position` view (mounted at /api/danger). Derived
 * on the fly from analyzed Games' stored `Evaluation`s (ADR-0009) — no engine
 * call on this path.
 */
export function createDangerRouter(db: Db): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ dangers: getDangerPositions(db) });
  });

  return router;
}
