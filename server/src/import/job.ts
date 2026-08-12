import type { Db } from "../db";
import type { ChessComClient } from "../chesscom";
import { importRange, type ImportRangeParams } from "./range";
import { monthsInRange } from "./months";
import type { ImportResult } from "./service";

/** Determinate progress of an Import, counted in months (ADR-0010). */
export interface ImportStatus {
  running: boolean;
  total: number;
  done: number;
  /** The range's consolidated summary; null until the pass has finished. */
  result: ImportResult | null;
}

export interface ImportJob {
  /** Current progress snapshot. */
  status(): ImportStatus;
  /**
   * Starts a background Import over the range and returns the resulting status
   * immediately (the caller does not await the pass). Single-flighted: if an
   * Import is already running, this is ignored and the running status is
   * returned unchanged.
   */
  start(params: ImportRangeParams): ImportStatus;
  /** Resolves when the current pass (if any) has finished — for tests/shutdown. */
  idle(): Promise<void>;
}

/**
 * The Import as a background job (ADR-0010: a range Import is long-running and
 * must not block the API, exactly as the analysis pass — see createAnalysisJob).
 * One job per app: `POST /api/import` calls `start` and returns 202 without
 * awaiting; the client polls `status()` via `GET /api/import/status` for
 * progress counted in months, then reads `result` once `running` is false.
 *
 * The Player's username is **not** checked here: it is verified once by the
 * route, before any job starts, so an unknown username fails synchronously.
 */
export function createImportJob(db: Db, client: ChessComClient): ImportJob {
  let status: ImportStatus = { running: false, total: 0, done: 0, result: null };
  let current: Promise<void> = Promise.resolve();

  return {
    status: () => ({ ...status }),

    start(params) {
      if (status.running) return { ...status };

      status = {
        running: true,
        total: monthsInRange(params.from, params.to).length,
        done: 0,
        result: null,
      };

      current = (async () => {
        try {
          const result = await importRange(db, client, params, () => {
            status = { ...status, done: status.done + 1 };
          });
          status = { ...status, result };
        } catch (err) {
          // An unforeseen failure must not take the relay down — end the pass
          // cleanly, as the analysis job does.
          console.error("Import failed:", err instanceof Error ? err.message : err);
        } finally {
          status = { ...status, running: false };
        }
      })();

      return { ...status };
    },

    idle: () => current,
  };
}
