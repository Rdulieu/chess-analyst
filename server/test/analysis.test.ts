import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { openDb } from "../src/db";
import { games, evaluations, type NewGame } from "../src/db/schema";
import { analyzeGame } from "../src/analysis/service";
import { createAnalysisJob } from "../src/analysis/job";
import { createFixtureEngine } from "../src/engine/fixture";
import type { Engine } from "../src/engine/types";

function tempDb() {
  return openDb(":memory:").db;
}

let urlSeq = 0;
/** Inserts a Game and returns the stored row (with its generated id + flags). */
function seedGame(db: ReturnType<typeof tempDb>, game: Partial<NewGame> & Pick<NewGame, "pgn">) {
  return db
    .insert(games)
    .values({
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

describe("analyzeGame", () => {
  it("stores one Evaluation per Position — the initial Position plus one after each half-move", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5 2. Nf3" }); // 3 half-moves → 4 Positions

    await analyzeGame(db, createFixtureEngine(), game);

    const rows = evalsOf(db, game.id);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.ply).sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
    expect(rows.every((r) => typeof r.cp === "number")).toBe(true);
  });

  it("sets the analyzed flag once the pass is done", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });

    await analyzeGame(db, createFixtureEngine(), game);

    expect(db.select().from(games).where(eq(games.id, game.id)).get()!.analyzed).toBe(true);
  });

  it("re-running on an already-analyzed Game is a no-op (no duplicate Evaluations, no re-run)", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" }); // 2 half-moves → 3 Positions

    await analyzeGame(db, createFixtureEngine(), game);
    await analyzeGame(db, createFixtureEngine(), game); // second run must be a no-op

    expect(evalsOf(db, game.id)).toHaveLength(3);
  });
});

describe("analysis job", () => {
  it("counts progress in Positions to evaluate, not in Games", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5 2. Nf3" }); // 3 half-moves → 4 Positions

    const job = createAnalysisJob(db, createFixtureEngine());
    expect(job.start([game.id])).toMatchObject({ running: true, total: 4, done: 0 });

    await job.idle();
    expect(job.status()).toMatchObject({ running: false, total: 4, done: 4 });
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
    job.start([game.id]);
    while (evaluated < 3) await new Promise((r) => setTimeout(r, 5));

    expect(job.status()).toMatchObject({ running: true, done: 2, total: 4 });

    release();
    await job.idle();
    expect(job.status()).toMatchObject({ running: false, done: 4, total: 4 });
  });

  it("runs only the not-yet-analyzed Games and advances to done === total, then running:false", async () => {
    const db = tempDb();
    const already = seedGame(db, { pgn: "1. e4 e5" });
    const pending = seedGame(db, { pgn: "1. d4 d5" });
    await analyzeGame(db, createFixtureEngine(), already); // this one must be skipped

    const job = createAnalysisJob(db, createFixtureEngine());
    const started = job.start([already.id, pending.id]);
    // Only `pending` is left: 2 half-moves → 3 Positions. The already-analyzed
    // Game contributes neither to the total nor to the derived done.
    expect(started).toMatchObject({ running: true, total: 3 });

    await job.idle();
    expect(job.status()).toEqual({ running: false, total: 3, done: 3, games: 1, acknowledged: false });
    expect(db.select().from(games).where(eq(games.id, pending.id)).get()!.analyzed).toBe(true);
  });

  it("reports the last pass to a job rebuilt over the same store (it outlives the process)", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5 2. Nf3" }); // 4 Positions

    const job = createAnalysisJob(db, createFixtureEngine());
    job.start([game.id]);
    await job.idle();

    // A fresh job over the same store — as after an app restart.
    const rebuilt = createAnalysisJob(db, createFixtureEngine());
    expect(rebuilt.status()).toMatchObject({ running: false, total: 4, done: 4 });
  });

  it("is single-flighted — a second start while one is running is ignored", async () => {
    const db = tempDb();
    const first = seedGame(db, { pgn: "1. e4 e5" });
    const other = seedGame(db, { pgn: "1. d4 d5" });

    const job = createAnalysisJob(db, createFixtureEngine());
    job.start([first.id]);
    job.start([other.id]); // ignored: a pass is already running

    await job.idle();
    expect(db.select().from(games).where(eq(games.id, other.id)).get()!.analyzed).toBe(false);
  });

  it("reports nothing to do (total 0, not running) when every given Game is already analyzed", async () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });
    await analyzeGame(db, createFixtureEngine(), game);

    const job = createAnalysisJob(db, createFixtureEngine());
    expect(job.start([game.id])).toEqual({
      running: false,
      total: 0,
      done: 0,
      games: 0,
      acknowledged: false,
      started: false,
    });
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
    job.start([game.id]);
    await job.idle();

    expect(job.status().running).toBe(false);
    expect(db.select().from(games).where(eq(games.id, game.id)).get()!.analyzed).toBe(false);
  });
});
