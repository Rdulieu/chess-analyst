import type { Db } from "../db";
import { clientFor, type PlatformRegistry } from "../platform";
import { importRange, type ImportRangeParams } from "./range";
import { monthsInRange } from "./months";
import { emptyTally, type ImportResult } from "./service";

/** Determinate progress of an Import, counted in months (ADR-0010). */
export interface ImportStatus {
  running: boolean;
  total: number;
  done: number;
  /**
   * Set while the Platform has asked the Import to **wait** rather than
   * answering — its own state, neither progress nor failure. Null the rest of
   * the time, including once the wait is over: a stale notice would claim the
   * Import is still held when it has moved on.
   */
  waiting: string | null;
  /**
   * The range's consolidated summary. It **fills in as the Import goes** — a
   * month's line appears as soon as that month is covered — so `running` is
   * what tells you whether it is final, not its presence. Null only before any
   * Import has been started.
   */
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
 * The client is resolved per Import from the Profile's `Platform`, out of the
 * registry the app was wired with — the job knows no Platform by name.
 *
 * The Player's username is **not** checked here: it is verified once by the
 * route, before any job starts, so an unknown username fails synchronously.
 */
export function createImportJob(db: Db, clients: PlatformRegistry): ImportJob {
  let status: ImportStatus = { running: false, total: 0, done: 0, waiting: null, result: null };
  let current: Promise<void> = Promise.resolve();

  return {
    status: () => ({ ...status }),

    start(params) {
      if (status.running) return { ...status };

      // The client is resolved from the Profile's own `Platform` (ADR-0014/0016):
      // the site is a property of the Profile, never a parameter of an Import.
      const client = clientFor(clients, params.platform);

      status = {
        running: true,
        total: monthsInRange(params.from, params.to).length,
        done: 0,
        waiting: null,
        result: emptySummary(),
      };

      current = (async () => {
        try {
          const result = await importRange(
            db,
            client,
            {
              ...params,
              // A month that got through stops the notice: the wait is over.
              onWaiting: (message) => {
                status = { ...status, waiting: message };
              },
            },
            (soFar) => {
              status = { ...status, done: status.done + 1, waiting: null, result: soFar };
            },
          );
          status = { ...status, result };
        } catch (err) {
          // An unforeseen failure must not take the relay down — end the pass
          // cleanly, as the analysis job does.
          console.error("Import failed:", err instanceof Error ? err.message : err);
        } finally {
          status = { ...status, running: false, waiting: null };
        }
      })();

      return { ...status };
    },

    idle: () => current,
  };
}

/** The summary an Import starts from: everything at zero, no month covered yet. */
const emptySummary = (): ImportResult => ({
  totalFetched: 0,
  imported: 0,
  alreadyPresent: 0,
  byCategory: emptyTally(),
  results: { win: 0, loss: 0, draw: 0 },
  months: [],
});
