import { Router } from "express";
import type { ChessComClient } from "../chesscom";
import type { ImportJob } from "../import";

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

    // Checked once, here, before anything starts: an unknown username must fail
    // synchronously, and the answer cannot differ from one month to the next.
    try {
      if (!(await chessCom.playerExists(username))) {
        res.status(404).json({ error: `Unknown chess.com username: ${username}` });
        return;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      console.error("Import failed:", message);
      res.status(502).json({ error: `Import from chess.com failed: ${message}` });
      return;
    }

    res.status(202).json(job.start({ username, from, to, categories }));
  });

  router.get("/status", (_req, res) => res.json(job.status()));

  return router;
}
