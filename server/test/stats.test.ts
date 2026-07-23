import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { games, type NewGame } from "../src/db/schema";
import { getStats } from "../src/stats/repository";

function tempDb() {
  return openDb(":memory:").db;
}

let seq = 0;
function seed(db: ReturnType<typeof tempDb>, g: Partial<NewGame> & Pick<NewGame, "result">) {
  db.insert(games)
    .values({
      gameUrl: `https://chess.com/g/${seq++}`,
      pgn: "1. e4 e5",
      opponent: "opp",
      playerColor: "white",
      date: "2026-01-01",
      timeControlCategory: "blitz",
      ...g,
    })
    .run();
}

describe("getStats", () => {
  it("totals the games and the win/draw/loss tally over all Games", () => {
    const db = tempDb();
    seed(db, { result: "win" });
    seed(db, { result: "loss" });
    seed(db, { result: "draw" });

    const stats = getStats(db);

    expect(stats.total.games).toBe(3);
    expect([stats.total.win, stats.total.draw, stats.total.loss]).toEqual([1, 1, 1]);
  });

  it("computes the Win rate with standard scoring, and null when there are no Games", () => {
    const db = tempDb();
    expect(getStats(db).total.winRate).toBeNull(); // empty history: no rate

    seed(db, { result: "win" });
    seed(db, { result: "draw" });
    // (1 win + 0.5·1 draw) / 2 games = 0.75
    expect(getStats(db).total.winRate).toBe(0.75);
  });

  it("breaks the results down per cadence, with all four cadences always present", () => {
    const db = tempDb();
    seed(db, { result: "win", timeControlCategory: "blitz" });
    seed(db, { result: "loss", timeControlCategory: "blitz" });
    seed(db, { result: "win", timeControlCategory: "bullet" });

    const { byCategory } = getStats(db);

    expect(byCategory.blitz).toMatchObject({ games: 2, win: 1, loss: 1, winRate: 0.5 });
    expect(byCategory.bullet).toMatchObject({ games: 1, win: 1, winRate: 1 });
    // Unplayed cadences are present at zero, with no rate.
    expect(byCategory.rapid).toEqual({ games: 0, win: 0, draw: 0, loss: 0, winRate: null });
    expect(byCategory.daily).toEqual({ games: 0, win: 0, draw: 0, loss: 0, winRate: null });
  });

  it("breaks the results down by the side the Player played", () => {
    const db = tempDb();
    seed(db, { result: "win", playerColor: "white" });
    seed(db, { result: "loss", playerColor: "white" });
    seed(db, { result: "draw", playerColor: "black" });

    const { bySide } = getStats(db);

    expect(bySide.white).toMatchObject({ games: 2, win: 1, loss: 1, winRate: 0.5 });
    expect(bySide.black).toMatchObject({ games: 1, draw: 1, winRate: 0.5 });
  });
});
