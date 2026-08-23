import { and, inArray, count, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "../db";
import type { Engine } from "../engine/types";
import { ANALYSIS_REGIME } from "../engine/types";
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

/**
 * Whether a pass under the current `Search regime` has work to do on this Game:
 * either it was never analyzed, or its stored `Evaluation`s came from a
 * **different** regime, in which case the Game is re-evaluated whole
 * (CONTEXT.md, `Search regime`).
 *
 * The regime is consulted here and not only inside `analyzeGame`, because this
 * is where the selection is made: filtering on the `analyzed` flag alone was
 * enough, on its own, to make the rule unreachable — a Game analyzed at another
 * depth was dropped from the pass before anything could compare anything.
 */
function needsAnalysis(db: Db, game: Game): boolean {
  if (!game.analyzed) return true;
  return (
    (db
      .select({ n: count() })
      .from(evaluations)
      .innerJoin(analysisPasses, eq(evaluations.passId, analysisPasses.id))
      .where(
        and(
          eq(evaluations.gameId, game.id),
          eq(analysisPasses.depth, ANALYSIS_REGIME.depth),
          eq(analysisPasses.lines, ANALYSIS_REGIME.lines),
        ),
      )
      .get()?.n ?? 0) === 0
  );
}

/**
 * A pass was pointed at a Game belonging to **another** `Profile`. Thrown rather
 * than silently dropped: narrowing the selection would spend engine time on a
 * subset while the Player believes their whole selection is covered, and the
 * partition ADR-0014 establishes is only trustworthy if crossing it is loud.
 */
export class ForeignGameError extends Error {
  constructor(readonly gameIds: number[]) {
    super(
      `Ces parties n'appartiennent pas au profil analysé : ${gameIds.join(", ")}. Une analyse porte sur les parties d'un seul profil.`,
    );
    this.name = "ForeignGameError";
  }
}

export interface AnalysisJob {
  /**
   * Progress of **one `Profile`'s** own last pass. Scoped, because the readout
   * is shown on that Profile's screens: reporting "the last pass" whoever ran it
   * would show one Player their neighbour's engine work as if it were theirs.
   */
  status(profileId: number): AnalysisStatus;
  /**
   * Starts a background pass **for one `Profile`** over the not-yet-analyzed
   * among `gameIds`, and returns the resulting status immediately (the caller
   * does not await the pass). Single-flighted: if a pass is already running,
   * this is ignored and the running status is returned unchanged.
   *
   * The Profile is passed in rather than read off the Games: a pass goes exactly
   * where it was pointed (ADR-0014), so a `gameId` belonging to someone else is
   * a caller's mistake to refuse, not a Game to quietly analyze.
   */
  start(
    profileId: number,
    gameIds: number[],
    /**
     * `overwrite` — the Player asked for these Games to be analyzed **again**
     * and confirmed losing their stored `Evaluation`s (US-15a 07). It lifts the
     * "already analyzed under this regime" filter for **exactly the Games
     * named**, and never for a wider selection: overwriting is a per-Game act
     * the Player confirmed by name.
     */
    options?: { overwrite?: boolean },
  ): AnalysisStatus & { started: boolean };
  /** Marks **this Profile's** last pass's summary as seen. Display only. */
  acknowledge(profileId: number): void;
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

  /** The pass a `Profile`'s screens report on: **its** most recent row, or none yet. */
  const lastPass = (profileId: number) =>
    db
      .select()
      .from(analysisPasses)
      .where(eq(analysisPasses.profileId, profileId))
      .orderBy(desc(analysisPasses.id))
      .limit(1)
      .get();

  /**
   * The pass currently burning engine time, if any. One engine, so one pass at a
   * time app-wide — but `running` is reported only to the Profile it runs for:
   * another Profile's page must not show a progress bar for work that will not
   * change a single one of its figures.
   */
  let runningPassId: number | null = null;

  const snapshot = (profileId: number): AnalysisStatus => {
    const pass = lastPass(profileId);
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
    const running = runningPassId === pass.id;
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

    start(profileId, gameIds, { overwrite = false } = {}) {
      // One engine, so one pass at a time — whichever Profile asked.
      if (runningPassId !== null) return { ...snapshot(profileId), started: false };

      const selected = gameIds
        .map((id) => getGame(db, id))
        .filter((game): game is Game => game !== undefined);

      // The partition, enforced where the engine time is actually committed: a
      // pass goes exactly where it was pointed (ADR-0014). Checked before the
      // `analyzed` filter, so a foreign Game that happens to be analyzed already
      // is still refused rather than passing unnoticed.
      const foreign = selected.filter((game) => game.profileId !== profileId);
      if (foreign.length > 0) throw new ForeignGameError(foreign.map((game) => game.id));

      // Everything named, when the Player confirmed the overwrite: the filter
      // exists to avoid spending engine time twice by accident, and this is the
      // one path where spending it again is the whole request.
      const pending = overwrite ? selected : selected.filter((game) => needsAnalysis(db, game));

      // Nothing to analyze: no pass is opened at all — an empty pass is not a
      // pass, and must not overwrite the one the Player last ran.
      if (pending.length === 0) return { ...snapshot(profileId), started: false };

      const pass = db
        .insert(analysisPasses)
        .values({
          profileId,
          gameIds: pending.map((game) => game.id),
          // Every Position of every pending Game — the initial Position
          // included, which is what the engine actually evaluates.
          total: pending.reduce((sum, game) => sum + gamePositions(game.pgn).length, 0),
          // The `Search regime` this pass runs under, recorded on the pass
          // itself: it is what lets a later pass tell whether a Game's stored
          // Evaluations are comparable with the ones it would add.
          ...ANALYSIS_REGIME,
          startedAt: new Date().toISOString(),
        })
        .returning()
        .get();
      runningPassId = pass.id;
      let failure: string | null = null;
      current = (async () => {
        try {
          for (const game of pending) {
            await analyzeGame(db, engine, game, pass, { overwrite });
          }
        } catch (err) {
          // A backend failure (e.g. the engine not being wired up) must not take
          // the relay down — but it must not vanish into a log either: the
          // Player is told, on screen, that the pass failed and why (US-8).
          failure = err instanceof Error ? err.message : String(err);
        } finally {
          runningPassId = null;
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
      return { ...snapshot(profileId), started: true };
    },

    acknowledge(profileId) {
      const pass = lastPass(profileId);
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
