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
  it("runs only the not-yet-analyzed Games and advances to done === total, then running:false", async () => {
    const db = tempDb();
    const already = seedGame(db, { pgn: "1. e4 e5" });
    const pending = seedGame(db, { pgn: "1. d4 d5" });
    await analyzeGame(db, createFixtureEngine(), already); // this one must be skipped

    const job = createAnalysisJob(db, createFixtureEngine());
    const started = job.start([already.id, pending.id]);
    expect(started).toMatchObject({ running: true, total: 1 }); // only `pending` is left

    await job.idle();
    expect(job.status()).toEqual({ running: false, total: 1, done: 1 });
    expect(db.select().from(games).where(eq(games.id, pending.id)).get()!.analyzed).toBe(true);
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
    expect(job.start([game.id])).toEqual({ running: false, total: 0, done: 0 });
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
