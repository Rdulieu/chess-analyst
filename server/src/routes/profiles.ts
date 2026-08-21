import { Router } from "express";
import type { Db } from "../db";
import type { ChessComClient } from "../chesscom";
import { deleteProfile, getProfile, listProfiles, resolveProfile } from "../profiles/repository";

/**
 * The `Profile`s (mounted at /api/profiles): list, create, delete. Creation goes
 * through the platform — a Profile that was never validated must never blend
 * into the list looking like the others (US-11) — and stores the canonical
 * spelling the platform answers.
 */
export function createProfilesRouter(db: Db, chessCom: ChessComClient): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(listProfiles(db));
  });

  // One Profile's own page reads this: its identity and the size of the history
  // it owns. An unknown id is refused, not answered with an empty Profile.
  router.get("/:id", (req, res) => {
    const profile = getProfile(db, Number(req.params.id));
    if (profile === undefined) {
      res.status(404).json({ error: "Profil introuvable." });
      return;
    }
    res.json(profile);
  });

  router.post("/", async (req, res) => {
    const { username } = req.body ?? {};
    if (typeof username !== "string" || !username.trim()) {
      res.status(400).json({ error: "Un nom de compte est requis." });
      return;
    }
    const typed = username.trim();
    // "Not reachable" is not "does not exist", and the two answers differ: only
    // the second is the user's mistake. Express 4 does not catch a rejected
    // async handler, so the failure is caught here or the request hangs.
    let player;
    try {
      player = await chessCom.fetchPlayer(typed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Profile creation failed:", message);
      res.status(502).json({
        error: `chess.com est injoignable : le profil n'a pas été créé (${message})`,
      });
      return;
    }
    if (player === null) {
      res.status(404).json({ error: `Compte chess.com introuvable : ${typed}` });
      return;
    }
    // Creating an account that is already a Profile SELECTS it: two spellings of
    // one account are one Profile, and the caller gets the one it meant.
    const { profile, created } = resolveProfile(db, "chesscom", player.username);
    res.status(created ? 201 : 200).json(profile);
  });

  router.delete("/:id", (req, res) => {
    if (!deleteProfile(db, Number(req.params.id))) {
      res.status(404).json({ error: "Profil introuvable." });
      return;
    }
    res.status(204).end();
  });

  return router;
}
