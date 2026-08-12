import { inArray, count, desc, eq } from "drizzle-orm";
import type { Db } from "../db";
import type { Engine } from "../engine/types";
import { analysisPasses, evaluations, type Game } from "../db/schema";
import { getGame } from "../repository";
import { gamePositions } from "../chess/positions";
import { analyzeGame } from "./service";

/**
 * Determinate progress of the `Analysis pass` (ADR-0009, US-4), counted in
 * **Positions evaluated** (US-8): a pass evaluates every Position of every Game
 * it covers — the initial one included — so counting whole Games left a
 * single-Game pass reading `0/1` for its entire multi-minute run.
 */
export interface AnalysisStatus {
  running: boolean;
  /** Positions the pass set out to evaluate. */
  total: number;
  /** Positions evaluated so far — derived from the stored Evaluations. */
  done: number;
  /** Games the pass covers, for the Player-facing summary line. */
  games: number;
  /** Whether the Player has dismissed this pass's summary. */
  acknowledged: boolean;
}

/**
 * Positions evaluated so far among `gameIds` — **derived**, never a stored
 * counter (ADR-0010): the `evaluations` rows *are* the progress, so there is no
 * second figure that can drift when the process dies between an insert and an
 * increment.
 */
function evaluatedPositions(db: Db, gameIds: number[]): number {
  if (gameIds.length === 0) return 0;
  return (
    db
      .select({ n: count() })
      .from(evaluations)
      .where(inArray(evaluations.gameId, gameIds))
      .get()?.n ?? 0
  );
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
  start(gameIds: number[]): AnalysisStatus & { started: boolean };
  /** Marks the last pass's summary as seen by the Player. Display only. */
  acknowledge(): void;
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
  let running = false;
  let current: Promise<void> = Promise.resolve();

  /** The pass this job reports on: the most recent row, or none yet. */
  const lastPass = () =>
    db.select().from(analysisPasses).orderBy(desc(analysisPasses.id)).limit(1).get();

  const snapshot = (): AnalysisStatus => {
    const pass = lastPass();
    if (!pass) return { running: false, total: 0, done: 0, games: 0, acknowledged: false };
    return {
      running,
      total: pass.total,
      done: evaluatedPositions(db, pass.gameIds),
      games: pass.gameIds.length,
      acknowledged: pass.acknowledgedAt !== null,
    };
  };

  return {
    status: snapshot,

    start(gameIds) {
      if (running) return { ...snapshot(), started: false };

      const pending = gameIds
        .map((id) => getGame(db, id))
        .filter((game): game is Game => game !== undefined && !game.analyzed);

      // Nothing to analyze: no pass is opened at all — an empty pass is not a
      // pass, and must not overwrite the one the Player last ran.
      if (pending.length === 0) return { ...snapshot(), started: false };

      const pass = db
        .insert(analysisPasses)
        .values({
          gameIds: pending.map((game) => game.id),
          // Every Position of every pending Game — the initial Position
          // included, which is what the engine actually evaluates.
          total: pending.reduce((sum, game) => sum + gamePositions(game.pgn).length, 0),
          startedAt: new Date().toISOString(),
        })
        .returning()
        .get();
      running = true;
      current = (async () => {
        try {
          for (const game of pending) {
            await analyzeGame(db, engine, game);
          }
        } catch (err) {
          // A backend failure (e.g. the WASM/native engine not being wired yet)
          // must not take the relay down — end the pass cleanly, as the Import
          // route does for upstream failures.
          console.error("Analysis pass failed:", err instanceof Error ? err.message : err);
        } finally {
          running = false;
          db.update(analysisPasses)
            .set({ endedAt: new Date().toISOString() })
            .where(eq(analysisPasses.id, pass.id))
            .run();
        }
      })();
      return { ...snapshot(), started: true };
    },

    acknowledge() {
      const pass = lastPass();
      if (pass) {
        db.update(analysisPasses)
          .set({ acknowledgedAt: new Date().toISOString() })
          .where(eq(analysisPasses.id, pass.id))
          .run();
      }
    },

    idle: () => current,
  };
}
