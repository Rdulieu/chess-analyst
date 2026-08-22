import { Router } from "express";
import type { Db } from "../db";
import {
  clientFor,
  platformLabel,
  UnsupportedPlatformError,
  type Platform,
  type PlatformRegistry,
} from "../platform";
import { deleteProfile, getProfile, listProfiles, resolveProfile } from "../profiles/repository";

/**
 * The `Profile`s (mounted at /api/profiles): list, create, delete. Creation goes
 * through the **Platform** — a Profile that was never validated must never
 * blend into the list looking like the others (US-11) — and stores the canonical
 * spelling that Platform answers. Which Platform is asked is a property of the
 * Profile being created, and every message names it: a refusal must never tell
 * the Player chess.com is unreachable when they asked for another site.
 */

/** The Platform a creation request asks for; chess.com when it says nothing. */
const DEFAULT_PLATFORM: Platform = "chesscom";

const isPlatform = (value: unknown): value is Platform =>
  value === "chesscom" || value === "lichess";

export function createProfilesRouter(db: Db, clients: PlatformRegistry): Router {
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
    const { username, platform } = req.body ?? {};
    if (typeof username !== "string" || !username.trim()) {
      res.status(400).json({ error: "Un nom de compte est requis." });
      return;
    }
    const typed = username.trim();
    // The Platform is chosen at creation and never again (ADR-0014). An
    // unknown one, or one this build has no adapter for, is refused outright:
    // the alternative is a Profile validated against the wrong site.
    const asked = (platform ?? DEFAULT_PLATFORM) as Platform;
    if (!isPlatform(asked)) {
      res.status(400).json({ error: `Plateforme inconnue : ${String(platform)}` });
      return;
    }
    const label = platformLabel(asked);
    let client;
    try {
      client = clientFor(clients, asked);
    } catch (err) {
      if (err instanceof UnsupportedPlatformError) {
        res.status(400).json({ error: err.message });
        return;
      }
      throw err;
    }
    // "Not reachable" is not "does not exist", and the two answers differ: only
    // the second is the user's mistake. Express 4 does not catch a rejected
    // async handler, so the failure is caught here or the request hangs.
    let player;
    try {
      player = await client.fetchPlayer(typed);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Profile creation failed:", message);
      res
        .status(502)
        .json({ error: `${label} est injoignable : le profil n'a pas été créé (${message})` });
      return;
    }
    if (player === null) {
      res.status(404).json({ error: `Compte ${label} introuvable : ${typed}` });
      return;
    }
    // Creating an account that is already a Profile SELECTS it: two spellings of
    // one account are one Profile, and the caller gets the one it meant.
    const { profile, created } = resolveProfile(db, asked, player.username);
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
