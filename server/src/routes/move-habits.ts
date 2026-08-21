import { Router } from "express";
import type { Db } from "../db";
import { listCandidates } from "../move-habits/repository";
import { scopedProfile } from "./scope";

/**
 * Read route for the `Move habit` explorer (mounted at /api/move-habits).
 * `GET /?profileId=&side=white|black&fen=<4-field FEN>` returns **that
 * Profile's** candidate Moves from that Position for that side (ADR-0014). The UI computes the resulting FEN client-side as
 * it drills down and calls this for each level.
 */
export function createMoveHabitsRouter(db: Db): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const profile = scopedProfile(db, req, res);
    if (!profile) return;
    const { side, fen } = req.query;
    if ((side !== "white" && side !== "black") || typeof fen !== "string") {
      res.status(400).json({ error: "query params `side` (white|black) and `fen` are required" });
      return;
    }
    res.json({ candidates: listCandidates(db, profile.id, fen, side) });
  });

  return router;
}
