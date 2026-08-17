import { Router } from "express";
import type { ChessComClient } from "../chesscom";
import { normalizeRange, type ImportJob } from "../import";

/**
 * Import routes (mounted at /api/import). A range Import is long-running, so
 * POST only *starts* it and answers 202 with the initial status; the client
 * polls GET /status for progress counted in months and reads the consolidated
 * summary once it stops running (ADR-0010).
 */
export function createImportRouter(job: ImportJob, chessCom: ChessComClient): Router {
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
    try {
      if ((await chessCom.fetchPlayer(username)) === null) {
        res.status(404).json({ error: `Unknown chess.com username: ${username}` });
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      console.error("Import failed:", message);
      res.status(502).json({ error: `Import from chess.com failed: ${message}` });
      return;
    }

    res.status(202).json(job.start({ username, ...range, categories }));
  });

  router.get("/status", (_req, res) => res.json(job.status()));

  return router;
}

/** The month the Player is in, as the range's upper bound. */
function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}