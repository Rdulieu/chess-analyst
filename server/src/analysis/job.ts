import type { Db } from "../db";
import type { Engine } from "../engine/types";
import type { Game } from "../db/schema";
import { getGame } from "../repository";
import { analyzeGame } from "./service";

/** Determinate progress of the analysis pass (ADR-0009, US-4). */
export interface AnalysisStatus {
  running: boolean;
  total: number;
  done: number;
}

export interface AnalysisJob {
  /** Current progress snapshot. */
  status(): AnalysisStatus;
  /**
   * Starts a background pass over the **not-yet-analyzed** among `gameIds` and
   * returns the resulting status immediately (the caller does not await the
   * pass). Single-flighted: if a pass is already running, this is ignored and
   * the running status is returned unchanged.
   */
  start(gameIds: number[]): AnalysisStatus;
  /** Resolves when the current pass (if any) has finished — for tests/shutdown. */
  idle(): Promise<void>;
}

/**
 * The analysis pass as a background job (ADR-0008: a minutes-long pass must not
 * block the API). One job per app: `POST /api/analyze` calls `start` and returns
 * 202 without awaiting; the client polls `status()` via `GET /api/analyze/status`
 * for determinate progress that advances to `done === total`, then `running:false`.
 */
export function createAnalysisJob(db: Db, engine: Engine): AnalysisJob {
  let status: AnalysisStatus = { running: false, total: 0, done: 0 };
  let current: Promise<void> = Promise.resolve();

  return {
    status: () => ({ ...status }),

    start(gameIds) {
      if (status.running) return { ...status };

      const pending = gameIds
        .map((id) => getGame(db, id))
        .filter((game): game is Game => game !== undefined && !game.analyzed);

      if (pending.length === 0) {
        status = { running: false, total: 0, done: 0 };
        return { ...status };
      }

      status = { running: true, total: pending.length, done: 0 };
      current = (async () => {
        try {
          for (const game of pending) {
            await analyzeGame(db, engine, game);
            status = { ...status, done: status.done + 1 };
          }
        } catch (err) {
          // A backend failure (e.g. the WASM/native engine not being wired yet)
          // must not take the relay down — end the pass cleanly, as the Import
          // route does for upstream failures.
          console.error("Analysis pass failed:", err instanceof Error ? err.message : err);
        } finally {
          status = { ...status, running: false };
        }
      })();
      return { ...status };
    },

    idle: () => current,
  };
}
