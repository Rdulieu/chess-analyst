import { Router } from "express";
import type { Db } from "../db";
import { getPlayerUsername, setPlayerUsername } from "../repository";

/** Player settings (mounted at /api/settings): the remembered chess.com username. */
export function createSettingsRouter(db: Db): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ username: getPlayerUsername(db) ?? null });
  });

  router.put("/", (req, res) => {
    const { username } = req.body ?? {};
    if (typeof username !== "string" || !username.trim()) {
      res.status(400).json({ error: "username required" });
      return;
    }
    const trimmed = username.trim();
    setPlayerUsername(db, trimmed);
    res.json({ username: trimmed });
  });

  return router;
}
