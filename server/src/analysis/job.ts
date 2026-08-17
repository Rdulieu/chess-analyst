import { inArray, count, desc, eq, isNull } from "drizzle-orm";
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
  /** How the pass ended; null while it runs (CONTEXT.md, `Analysis pass`). */
  outcome: "completed" | "interrupted" | "failed" | null;
  /** What went wrong, on a failed pass. */
  error: string | null;
}

/**
 * Positions evaluated so far among `gameIds` — **derived**, never a stored
 * counter (ADR-0011): the `evaluations` rows *are* the progress, so there is no
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

  // A pass row with no end was killed by a shutdown: close it as `interrupted`
  // (ADR-0011). Done here, at construction, so a job cannot exist without having
  // reconciled — there is no separate call anyone could forget. The dead pass is
  // deliberately **not** resumed: every engine run in this app is
  // Player-triggered, as `Import` is, and silently burning minutes of CPU at
  // startup would break that. The Evaluations it did produce stay put, and the
  // next pass picks up where it left off.
  db.update(analysisPasses)
    .set({ endedAt: new Date().toISOString(), outcome: "interrupted" })
    .where(isNull(analysisPasses.endedAt))
    .run();

  /** The pass this job reports on: the most recent row, or none yet. */
  const lastPass = () =>
    db.select().from(analysisPasses).orderBy(desc(analysisPasses.id)).limit(1).get();

  const snapshot = (): AnalysisStatus => {
    const pass = lastPass();
    if (!pass)
      return {
        running: false,
        total: 0,
        done: 0,
        games: 0,
        acknowledged: false,
        outcome: null,
        error: null,
      };
    return {
      running,
      total: pass.total,
      done: evaluatedPositions(db, pass.gameIds),
      games: pass.gameIds.length,
      acknowledged: pass.acknowledgedAt !== null,
      outcome: running ? null : pass.outcome,
      error: pass.error,
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

      // A pass is reported under the `Profile` it ran for (ADR-0014), and it
      // reads its owner off the Games themselves rather than being told: engine
      // time is spent on one Player's history, so Games from two Profiles in
      // one call is a caller's mistake, not a pass to open.
      const owners = new Set(pending.map((game) => game.profileId));
      if (owners.size > 1) {
        throw new Error("An Analysis pass covers one Profile's Games, not several.");
      }

      const pass = db
        .insert(analysisPasses)
        .values({
          profileId: pending[0].profileId,
          gameIds: pending.map((game) => game.id),
          // Every Position of every pending Game — the initial Position
          // included, which is what the engine actually evaluates.
          total: pending.reduce((sum, game) => sum + gamePositions(game.pgn).length, 0),
          startedAt: new Date().toISOString(),
        })
        .returning()
        .get();
      running = true;
      let failure: string | null = null;
      current = (async () => {
        try {
          for (const game of pending) {
            await analyzeGame(db, engine, game);
          }
        } catch (err) {
          // A backend failure (e.g. the engine not being wired up) must not take
          // the relay down — but it must not vanish into a log either: the
          // Player is told, on screen, that the pass failed and why (US-8).
          failure = err instanceof Error ? err.message : String(err);
        } finally {
          running = false;
          db.update(analysisPasses)
            .set({
              endedAt: new Date().toISOString(),
              outcome: failure === null ? "completed" : "failed",
              error: failure,
            })
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
