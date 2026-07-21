import { Router } from "express";
import type { Db } from "../db";
import type { ChessComClient } from "../chesscom";
import { importMonth, UnknownUsernameError } from "../import";

/** Import route (mounted at /api/import): runs one month's Import via the relay. */
export function createImportRouter(db: Db, chessCom: ChessComClient): Router {
  const router = Router();

  router.post("/", async (req, res) => {
    const { username, year, month, categories } = req.body ?? {};
    try {
      const result = await importMonth(db, chessCom, { username, year, month, categories });
      res.json(result);
    } catch (err) {
      if (err instanceof UnknownUsernameError) {
        res.status(404).json({ error: err.message });
        return;
      }
      // Any other failure is upstream (chess.com unreachable / rate-limited /
      // 5xx). Respond with 502 rather than rethrowing: an async throw here is an
      // unhandled rejection that would take the whole relay down.
      const message = err instanceof Error ? err.message : "Import failed";
      console.error("Import failed:", message);
      res.status(502).json({ error: `Import from chess.com failed: ${message}` });
    }
  });

  return router;
}
