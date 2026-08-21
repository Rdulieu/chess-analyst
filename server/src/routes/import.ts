import { Router } from "express";
import type { Db } from "../db";
import { normalizeRange, type ImportJob } from "../import";
import { findProfileById } from "../profiles/repository";

/**
 * Import routes (mounted at /api/import). A range Import is long-running, so
 * POST only *starts* it and answers 202 with the initial status; the client
 * polls GET /status for progress counted in months and reads the consolidated
 * summary once it stops running (ADR-0010).
 *
 * An Import is an operation **on one `Profile`** (ADR-0014): the request names
 * the Profile, and the account to fetch is that Profile's own. There is no
 * username input — it was the only way one account's Games could ever land
 * under another's Profile, and chess.com already vouched for the account when
 * the Profile was created, so asking again would check nothing.
 */
export function createImportRouter(db: Db, job: ImportJob): Router {
  const router = Router();

  router.post("/", (req, res) => {
    const { profileId, from, to, categories } = req.body ?? {};

    // Naming no Profile, or an unknown one, is REFUSED rather than answered:
    // the alternative is an Import quietly filing Games under whatever the
    // server picked, which is exactly what the partitioning exists against.
    const profile = findProfileById(db, Number(profileId));
    if (profile === undefined) {
      res.status(profileId === undefined || profileId === null ? 400 : 404).json({
        error:
          profileId === undefined || profileId === null
            ? "Aucun profil indiqué : l'import s'exécute depuis la page d'un profil."
            : `Profil introuvable : ${profileId}`,
      });
      return;
    }

    // An inverted range is an incoherent entry, refused outright; a last month
    // in the future is clamped silently. The range length is not capped — the
    // UI is what asks for confirmation on a very long one (ADR-0010).
    const range = normalizeRange(from, to, currentMonth());
    if (range === null) {
      res.status(400).json({ error: "The first month of the range is after the last." });
      return;
    }

    res
      .status(202)
      .json(job.start({ profileId: profile.id, username: profile.username, ...range, categories }));
  });

  router.get("/status", (_req, res) => res.json(job.status()));

  return router;
}

/** The month the Player is in, as the range's upper bound. */
function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
