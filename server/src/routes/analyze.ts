import { Router } from "express";
import type { Db } from "../db";
import { ForeignGameError, type AnalysisJob } from "../analysis/job";
import { scopedProfile } from "./scope";

/**
 * Analysis-pass routes (mounted at /api/analyze). `POST /` starts a background
 * pass over the not-yet-analyzed among the given `gameIds` — or over **all** of
 * them when the body carries `overwrite: true`, which is the Player having
 * confirmed losing an existing analysis (US-15a 07) — and returns 202
 * immediately (the pass runs in the background); `GET /status` reports the
 * determinate progress the client polls.
 *
 * Every route here names its `Profile` (ADR-0014). Starting a pass is where it
 * matters most: engine time is the most expensive thing this app spends, and a
 * pass must go exactly where it was pointed — so a request that names no
 * Profile, or an unknown one, is refused rather than answered over every row.
 */
export function createAnalyzeRouter(db: Db, job: AnalysisJob): Router {
  const router = Router();

  router.post("/", (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    const gameIds = Array.isArray(req.body?.gameIds)
      ? req.body.gameIds.filter((id: unknown): id is number => Number.isInteger(id))
      : [];
    // Only ever `true` when the client says so explicitly: a missing or
    // malformed flag means the ordinary pass, never a destruction.
    const overwrite = req.body?.overwrite === true;
    try {
      res.status(202).json(job.start(profile.id, gameIds, { overwrite }));
    } catch (err) {
      if (!(err instanceof ForeignGameError)) throw err;
      res.status(400).json({ error: err.message });
    }
  });

  // Acknowledging is a display concern: it hides the summary, and leaves the
  // pass's own record untouched — hence no body and no pass identifier, a
  // Profile only ever knows "my last pass".
  router.post("/acknowledge", (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    job.acknowledge(profile.id);
    res.status(204).end();
  });

  router.get("/status", (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    res.json(job.status(profile.id));
  });

  return router;
}
