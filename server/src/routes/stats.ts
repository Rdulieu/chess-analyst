import { Router } from "express";
import type { Db } from "../db";
import { getDamageStats, getReplayStats, getResultsSummary } from "../stats/repository";
import { scopedProfile } from "./scope";

/**
 * Read routes for the global stats page (mounted at /api/stats).
 *
 * **Three routes rather than one, split by what they cost** (US-32 slice 08).
 * The page used to make a single request and show nothing until the slowest
 * fold in it was done — 18 s on a 186-Game `Profile`, 53 s on the 1 806-Game
 * one — while the figure the Player came for, the results summary, had been
 * ready in under a millisecond the whole time.
 *
 * So the split is by price, not by subject:
 *
 * | route | cost | what it feeds |
 * |---|---|---|
 * | `GET /` | ~0 ms — `bucket()` over rows already in hand | the results tables |
 * | `GET /replay` | ~25 ms per Game — **one** PGN replay | signatures, bands, results by `Phase` |
 * | `GET /recaps` | ~250 ms per *analysed* Game | damage by `Phase` |
 *
 * `/` **stays** the results summary: it is the cheapest and the most asked for.
 * The two expensive groups are independent of each other and neither waits on
 * the other; what they must not do is hold up `/`.
 *
 * Every route is scoped to the `Profile` asked for (ADR-0014).
 */
export function createStatsRouter(db: Db): Router {
  const router = Router();

  // Synchronous work behind an `async` handler, deliberately: nothing here
  // yields because nothing here is slow.
  router.get("/", (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    res.json(getResultsSummary(db, profile.id));
  });

  // `async`, because these two fold every Game of the `Profile` — tens of
  // seconds on a large history. Both yield between batches so a slow answer is
  // a slow page rather than a server that answers nothing (ADR-0012's lesson,
  // one route over).
  router.get("/replay", async (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    res.json(await getReplayStats(db, profile.id));
  });

  router.get("/recaps", async (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    res.json(await getDamageStats(db, profile.id));
  });

  return router;
}
