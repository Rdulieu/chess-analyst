import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { openDb } from "../src/db";
import { games, evaluations, analysisPasses, type NewGame } from "../src/db/schema";
import { analyzeGame } from "../src/analysis/service";
import { createAnalysisJob } from "../src/analysis/job";
import { createFixtureEngine } from "../src/engine/fixture";
import { gamePositions } from "../src/chess/positions";
import type { Engine } from "../src/engine/types";
import { ANALYSIS_REGIME } from "../src/engine/types";
import { seedProfile } from "./fixtures";

function tempDb() {
  return openDb(":memory:").db;
}

let urlSeq = 0;
/** Inserts a Game and returns the stored row (with its generated id + flags). */
function seedGame(db: ReturnType<typeof tempDb>, game: Partial<NewGame> & Pick<NewGame, "pgn">) {
  return db
    .insert(games)
    .values({
      profileId: seedProfile(db),
      gameUrl: `https://chess.com/g/${urlSeq++}`,
      opponent: "opp",
      playerColor: "white",
      result: "win",
      date: "2026-01-01",
      timeControlCategory: "blitz",
      ...game,
    })
    .returning()
    .get();
}

const evalsOf = (db: ReturnType<typeof tempDb>, gameId: number) =>
  db.select().from(evaluations).where(eq(evaluations.gameId, gameId)).all();

/**
 * An `Analysis pass` for `gameIds`, under a `Search regime` (CONTEXT.md).
 * Every Evaluation is written **by** a pass, so a pass is what the analysis is
 * handed — and the regime it ran under is the pass's own property.
 */
function seedPass(
  db: ReturnType<typeof tempDb>,
  gameIds: number[],
  regime: { depth: number; lines: number } = ANALYSIS_REGIME,
) {
  return db
    .insert(analysisPasses)
    .values({
      profileId: seedProfile(db),
      gameIds,
      total: 0,
      startedAt: "2026-01-01T00:00:00Z",
      // Closed: an open pass is one a job would reconcile as `interrupted`, and
      // these passes exist to own Evaluations, not to be reported on.
      endedAt: "2026-01-01T00:01:00Z",
      outcome: "completed",
      ...regime,
    })
    .returning()
    .get();
}

describe("analyzeGame", () => {
  it("stores the Best line, the second line's score, and the pass that wrote them", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });
    const pass = seedPass(db, [game.id]);

    await analyzeGame(db, createFixtureEngine(), game, pass);

    const rows = evalsOf(db, game.id).sort((a, b) => a.ply - b.ply);
    // The line is stored **whole**, in UCI, its head being the best move
    // (ADR-0016) — the display cap is the client's business, never the store's.
    expect(rows[0].pv.split(" ").length).toBeGreaterThan(1);
    expect(rows.every((r) => r.pv.length > 0)).toBe(true);
    // The alternative's score, and never its line.
    expect(rows.every((r) => typeof r.cp2 === "number")).toBe(true);
    // The provenance that was missing: an Evaluation can be read back to the
    // `Search regime` that produced it.
    expect(rows.every((r) => r.passId === pass.id)).toBe(true);
  });

  it("stores one Evaluation per Position — the initial Position plus one after each half-move", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5 2. Nf3" }); // 3 half-moves → 4 Positions

    await analyzeGame(db, createFixtureEngine(), game, seedPass(db, [game.id]));

    const rows = evalsOf(db, game.id);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.ply).sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    expect(rows.every((r) => typeof r.cp === "number")).toBe(true);
  });

  it("stores the FEN it queried the engine with, alongside each Evaluation", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });

    await analyzeGame(db, createFixtureEngine(), game, seedPass(db, [game.id]));

    // The pass computes the FEN anyway to ask the engine; storing it is what
    // spares every read path a full PGN replay (ADR-0012).
    const rows = evalsOf(db, game.id).sort((a, b) => a.ply - b.ply);
    expect(rows.map((r) => r.fen)).toEqual(gamePositions(game.pgn));
  });

  it("sets the analyzed flag once the pass is done", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });

    await analyzeGame(db, createFixtureEngine(), game, seedPass(db, [game.id]));

    expect(db.select().from(games).where(eq(games.id, game.id)).get()!.analyzed).toBe(true);
  });

  it("re-running on an already-analyzed Game is a no-op (no duplicate Evaluations, no re-run)", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" }); // 2 half-moves → 3 Positions

    const pass = seedPass(db, [game.id]);
    await analyzeGame(db, createFixtureEngine(), game, pass);
    await analyzeGame(db, createFixtureEngine(), game, pass); // second run must be a no-op

    expect(evalsOf(db, game.id)).toHaveLength(3);
  });

  it("re-evaluates a Game whole when its stored Evaluations came from another Search regime", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5 2. Nf3" }); // 4 Positions

    // Analyzed at depth 8, one line: a shallower regime than the one this app
    // runs today.
    const shallow = seedPass(db, [game.id], { depth: 8, lines: 1 });
    await analyzeGame(db, createFixtureEngine(), game, shallow);
    expect(evalsOf(db, game.id)).toHaveLength(4);

    // Resuming would leave nothing to do; the regime differs, so the whole Game
    // is re-evaluated instead. A `Drift` figure is a sum over every ply, so one
    // Game must never mix two depths inside a single number.
    let evaluated = 0;
    const counting: Engine = {
      async evaluate(fen, depth) {
        evaluated++;
        return createFixtureEngine().evaluate(fen, depth);
      },
    };
    const pass = seedPass(db, [game.id]);
    await analyzeGame(db, counting, game, pass);

    expect(evaluated).toBe(4);
    const rows = evalsOf(db, game.id);
    expect(rows).toHaveLength(4); // replaced, not doubled
    expect(rows.every((r) => r.passId === pass.id)).toBe(true);
  });

  it("re-analyzes an already-analyzed Game under a new regime — the flag no longer short-circuits the comparison", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });
    await analyzeGame(db, createFixtureEngine(), game, seedPass(db, [game.id], { depth: 8, lines: 1 }));
    // The Game is flagged analyzed, which used to end the story right there.
    expect(db.select().from(games).where(eq(games.id, game.id)).get()!.analyzed).toBe(true);

    const pass = seedPass(db, [game.id]);
    await analyzeGame(db, createFixtureEngine(), game, pass);

    expect(evalsOf(db, game.id).every((r) => r.passId === pass.id)).toBe(true);
  });

  it("resumes a Game left half-evaluated, without recomputing what is already stored", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5 2. Nf3" }); // 4 Positions

    // A pass cut off after two Positions — what a shutdown mid-pass leaves
    // behind: rows stored, `analyzed` still false.
    let evaluated = 0;
    const dying: Engine = {
      async evaluate(fen, depth) {
        if (evaluated++ === 2) throw new Error("cut off");
        return createFixtureEngine().evaluate(fen, depth);
      },
    };
    const pass = seedPass(db, [game.id]);
    await analyzeGame(db, dying, game, pass).catch(() => {});
    expect(evalsOf(db, game.id)).toHaveLength(2);

    // The next pass must pick up at the third Position, not collide on the first.
    let reEvaluated = 0;
    const counting: Engine = {
      async evaluate(fen, depth) {
        reEvaluated++;
        return createFixtureEngine().evaluate(fen, depth);
      },
    };
    // The same regime, so the resumed pass continues where the dead one stopped.
    await analyzeGame(db, counting, game, seedPass(db, [game.id]));

    expect(reEvaluated).toBe(2); // only the two missing Positions
    expect(evalsOf(db, game.id)).toHaveLength(4);
    expect(db.select().from(games).where(eq(games.id, game.id)).get()!.analyzed).toBe(true);
  });
});

describe("analysis job", () => {
  /**
   * The `Profile` these tests' Games belong to — the only one a fresh in-memory
   * store holds. A pass is always **for** a Profile (ADR-0014), so every call
   * names it, even when there is only one to name.
   */
  const SOLE_PROFILE = 1;

  it("counts progress in Positions to evaluate, not in Games", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5 2. Nf3" }); // 3 half-moves → 4 Positions

    const job = createAnalysisJob(db, createFixtureEngine());
    expect(job.start(SOLE_PROFILE, [game.id])).toMatchObject({ running: true, total: 4, done: 0 });

    await job.idle();
    expect(job.status(SOLE_PROFILE)).toMatchObject({ running: false, total: 4, done: 4 });
  });

  it("reports the Positions actually stored while the pass is still running", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5 2. Nf3" }); // 4 Positions

    // An Engine that blocks once it has evaluated two Positions, so the pass can
    // be observed mid-flight.
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => (release = resolve));
    let evaluated = 0;
    const slow: Engine = {
      async evaluate(fen, depth) {
        if (++evaluated === 3) await blocked;
        return createFixtureEngine().evaluate(fen, depth);
      },
    };

    const job = createAnalysisJob(db, slow);
    job.start(SOLE_PROFILE, [game.id]);
    while (evaluated < 3) await new Promise((r) => setTimeout(r, 5));

    expect(job.status(SOLE_PROFILE)).toMatchObject({ running: true, done: 2, total: 4 });

    release();
    await job.idle();
    expect(job.status(SOLE_PROFILE)).toMatchObject({ running: false, done: 4, total: 4 });
  });

  it("runs only the not-yet-analyzed Games and advances to done === total, then running:false", async () => {
    const db = tempDb();
    const already = seedGame(db, { pgn: "1. e4 e5" });
    const pending = seedGame(db, { pgn: "1. d4 d5" });
    await analyzeGame(db, createFixtureEngine(), already, seedPass(db, [already.id])); // skipped

    const job = createAnalysisJob(db, createFixtureEngine());
    const started = job.start(SOLE_PROFILE, [already.id, pending.id]);
    // Only `pending` is left: 2 half-moves → 3 Positions. The already-analyzed
    // Game contributes neither to the total nor to the derived done.
    expect(started).toMatchObject({ running: true, total: 3 });

    await job.idle();
    expect(job.status(SOLE_PROFILE)).toEqual({
      running: false,
      total: 3,
      done: 3,
      games: 1,
      acknowledged: false,
      outcome: "completed",
      error: null,
    });
    expect(db.select().from(games).where(eq(games.id, pending.id)).get()!.analyzed).toBe(true);
  });

  it("reports the last pass to a job rebuilt over the same store (it outlives the process)", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5 2. Nf3" }); // 4 Positions

    const job = createAnalysisJob(db, createFixtureEngine());
    job.start(SOLE_PROFILE, [game.id]);
    await job.idle();

    // A fresh job over the same store — as after an app restart.
    const rebuilt = createAnalysisJob(db, createFixtureEngine());
    expect(rebuilt.status(SOLE_PROFILE)).toMatchObject({ running: false, total: 4, done: 4 });
  });

  it("closes a pass left open by a shutdown as interrupted, keeping what it evaluated", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5 2. Nf3" }); // 4 Positions

    // A pass killed mid-flight: rows stored, the pass row never closed — what
    // the store looks like after the app was shut down.
    let evaluated = 0;
    const dying: Engine = {
      async evaluate(fen, depth) {
        if (evaluated++ === 2) throw new Error("killed");
        return createFixtureEngine().evaluate(fen, depth);
      },
    };
    const killed = createAnalysisJob(db, dying);
    killed.start(SOLE_PROFILE, [game.id]);
    await killed.idle();
    db.update(analysisPasses).set({ endedAt: null, outcome: null, error: null }).run();

    // Restart: building a job is what reconciles — no separate call to forget.
    let engineUsed = false;
    const onRestart: Engine = {
      async evaluate(fen, depth) {
        engineUsed = true;
        return createFixtureEngine().evaluate(fen, depth);
      },
    };
    const rebuilt = createAnalysisJob(db, onRestart);

    expect(rebuilt.status(SOLE_PROFILE)).toMatchObject({
      running: false,
      outcome: "interrupted",
      done: 2, // the Positions it did evaluate are kept
      total: 4,
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(engineUsed).toBe(false); // a dead pass is never auto-resumed
  });

  it("covers a Game analyzed under another Search regime, instead of filtering it out as done", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" }); // 3 Positions
    await analyzeGame(db, createFixtureEngine(), game, seedPass(db, [game.id], { depth: 8, lines: 1 }));

    const job = createAnalysisJob(db, createFixtureEngine());
    const started = job.start(SOLE_PROFILE, [game.id]);

    // The `analyzed` flag used to be the filter, ahead of anything that could
    // look at the regime — so a Game analyzed at another depth could never be
    // re-analyzed at all.
    expect(started).toMatchObject({ started: true, total: 3 });
    await job.idle();
    expect(job.status(SOLE_PROFILE)).toMatchObject({ done: 3, total: 3, outcome: "completed" });
    expect(evalsOf(db, game.id)).toHaveLength(3);
  });

  it("still skips a Game already analyzed under the regime it is about to run", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });
    await analyzeGame(db, createFixtureEngine(), game, seedPass(db, [game.id]));

    // Same regime: nothing to redo, and no engine time spent twice.
    expect(createAnalysisJob(db, createFixtureEngine()).start(SOLE_PROFILE, [game.id])).toMatchObject({
      started: false,
    });
  });

  it("is single-flighted — a second start while one is running is ignored", async () => {
    const db = tempDb();
    const first = seedGame(db, { pgn: "1. e4 e5" });
    const other = seedGame(db, { pgn: "1. d4 d5" });

    const job = createAnalysisJob(db, createFixtureEngine());
    job.start(SOLE_PROFILE, [first.id]);
    job.start(SOLE_PROFILE, [other.id]); // ignored: a pass is already running

    await job.idle();
    expect(db.select().from(games).where(eq(games.id, other.id)).get()!.analyzed).toBe(false);
  });

  it("opens no pass when every given Game is already analyzed, and keeps reporting the last real one", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" }); // 2 half-moves → 3 Positions
    const job = createAnalysisJob(db, createFixtureEngine());
    job.start(SOLE_PROFILE, [game.id]);
    await job.idle();

    // Nothing left to do: no pass is opened — and the pass the Player actually
    // ran is still what their screen reports. An empty pass is not a pass, and
    // must not overwrite the one before it with a zeroed readout.
    expect(job.start(SOLE_PROFILE, [game.id])).toEqual({
      running: false,
      total: 3,
      done: 3,
      games: 1,
      acknowledged: false,
      outcome: "completed",
      error: null,
      started: false,
    });
  });

  it("records a failed outcome and what went wrong, instead of swallowing it into a log", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });
    const failing: Engine = {
      async evaluate() {
        throw new Error("engine backend unavailable");
      },
    };

    const job = createAnalysisJob(db, failing);
    job.start(SOLE_PROFILE, [game.id]);
    await job.idle();

    expect(job.status(SOLE_PROFILE)).toMatchObject({
      running: false,
      outcome: "failed",
      error: "engine backend unavailable",
    });
  });

  it("marks a completed pass as such", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });

    const job = createAnalysisJob(db, createFixtureEngine());
    job.start(SOLE_PROFILE, [game.id]);
    await job.idle();

    expect(job.status(SOLE_PROFILE)).toMatchObject({ outcome: "completed", error: null });
  });

  it("ends the pass (running:false) instead of crashing when the engine backend fails", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });
    const failing: Engine = {
      async evaluate() {
        throw new Error("backend not wired");
      },
    };

    const job = createAnalysisJob(db, failing);
    job.start(SOLE_PROFILE, [game.id]);
    await job.idle();

    expect(job.status(SOLE_PROFILE).running).toBe(false);
    expect(db.select().from(games).where(eq(games.id, game.id)).get()!.analyzed).toBe(false);
  });
});
