import { Router } from "express";
import type { Db } from "../db";
import type { ChessComClient } from "../chesscom";
import { normalizeRange, type ImportJob } from "../import";
import { resolveProfile } from "../profiles/repository";

/**
 * Import routes (mounted at /api/import). A range Import is long-running, so
 * POST only *starts* it and answers 202 with the initial status; the client
 * polls GET /status for progress counted in months and reads the consolidated
 * summary once it stops running (ADR-0010).
 */
export function createImportRouter(db: Db, job: ImportJob, chessCom: ChessComClient): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const { username, from, to, categories } = req.body ?? {};

    // An inverted range is an incoherent entry, refused outright; a last month
    // in the future is clamped silently. The range length is not capped — the
    // UI is what asks for confirmation on a very long one (ADR-0010).
    const range = normalizeRange(from, to, currentMonth());
    if (range === null) {
      res.status(400).json({ error: "The first month of the range is after the last." });
      return;
    }

    // Checked once, here, before anything starts: an unknown username must fail
    // synchronously, and the answer cannot differ from one month to the next.
    let player;
    try {
      player = await chessCom.fetchPlayer(username);
      if (player === null) {
        res.status(404).json({ error: `Unknown chess.com username: ${username}` });
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      console.error("Import failed:", message);
      res.status(502).json({ error: `Import from chess.com failed: ${message}` });
      return;
    }

    // Every Game needs an owner, and the check above just had chess.com vouch
    // for this account under its canonical spelling — which is exactly what a
    // `Profile` is. So the Import runs under that Profile, creating it the
    // first time this account is imported. Slice 03 moves the form onto the
    // Profile's own page and the account stops being typed in at all.
    const { profile } = resolveProfile(db, "chesscom", player.username);
    res.status(202).json(job.start({ profileId: profile.id, username: player.username, ...range, categories }));
  });

  router.get("/status", (_req, res) => res.json(job.status()));

  return router;
}

/** The month the Player is in, as the range's upper bound. */
function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}