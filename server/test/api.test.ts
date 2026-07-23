import { describe, it, expect } from "vitest";
import request from "supertest";
import { openDb } from "../src/db";
import { games } from "../src/db/schema";
import { createApp } from "../src/app";
import { recordMoveHabits } from "../src/move-habits/precompute";
import { MORPHY_GAME } from "./fixtures";
import type { ChessComClient, ChessComGame } from "../src/chesscom";

/** 4-field FEN of the standard starting Position. */
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

function chessComGame(over: Partial<ChessComGame> = {}): ChessComGame {
  return {
    url: "https://www.chess.com/game/live/100",
    pgn: "1. e4 e5",
    time_class: "blitz",
    rules: "chess",
    end_time: 1704067200,
    white: { username: "me", result: "win" },
    black: { username: "opp", result: "resigned" },
    ...over,
  };
}

function fakeClient(gamesForMonth: ChessComGame[], exists = true): ChessComClient {
  return {
    playerExists: async () => exists,
    fetchMonth: async () => gamesForMonth,
  };
}

function appWithGame() {
  const { db } = openDb(":memory:");
  db.insert(games).values(MORPHY_GAME).run();
  return createApp(db, fakeClient([]));
}

describe("games API", () => {
  it("GET /api/games returns the stored Games with their Game fields", async () => {
    const app = appWithGame();

    const res = await request(app).get("/api/games");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      opponent: "Duke Karl / Count Isouard",
      playerColor: "white",
      result: "win",
      timeControlCategory: "rapid",
    });
    expect(res.body[0].gameUrl).toContain("chess.com");
    expect(res.body[0].pgn).toContain("Morphy");
  });

  it("GET /api/games/:id returns that Game's full detail", async () => {
    const app = appWithGame();
    const list = await request(app).get("/api/games");
    const id = list.body[0].id as number;

    const res = await request(app).get(`/api/games/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, opponent: "Duke Karl / Count Isouard" });
    expect(res.body.pgn).toContain("O-O-O");
  });

  it("GET /api/games/:id returns 404 for an unknown id", async () => {
    const app = appWithGame();

    const res = await request(app).get("/api/games/9999");

    expect(res.status).toBe(404);
  });

  it("GET /api/games returns an empty list on a fresh database (no fixture seeded)", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient([]));

    const res = await request(app).get("/api/games");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("openings API", () => {
  function openingGame(over: Partial<import("../src/db/schema").NewGame> = {}) {
    return {
      gameUrl: `https://www.chess.com/game/live/${seqUrl++}`,
      pgn: "1. e4 e5",
      opponent: "opp",
      playerColor: "white" as const,
      result: "win" as const,
      date: "2026-01-01",
      timeControlCategory: "blitz" as const,
      eco: "B22",
      openingName: "Sicilian Defense Alapin Variation",
      ...over,
    };
  }
  let seqUrl = 0;

  it("GET /api/openings returns weak-opening entries (by opening, side, cadence) sorted by games desc", async () => {
    const { db } = openDb(":memory:");
    db.insert(games)
      .values([
        openingGame({ result: "win" }),
        openingGame({ result: "loss" }),
        openingGame({ eco: "C50", openingName: "Italian Game", result: "win" }),
      ])
      .run();
    const app = createApp(db, fakeClient([]));

    const res = await request(app).get("/api/openings");

    expect(res.status).toBe(200);
    expect(res.body.openings).toHaveLength(2);
    expect(res.body.openings[0]).toMatchObject({
      eco: "B22",
      openingName: "Sicilian Defense Alapin Variation",
      side: "white",
      cadence: "blitz",
      games: 2,
      win: 1,
      loss: 1,
      winRate: 0.5,
    });
    expect(res.body.openings[1]).toMatchObject({ eco: "C50", games: 1, winRate: 1 });
  });

  it("GET /api/openings returns { openings: [] } for an empty history", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient([]));

    const res = await request(app).get("/api/openings");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ openings: [] });
  });
});

describe("import API", () => {
  it("POST /api/import imports the month and the Games then show up in GET /api/games", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient([
      chessComGame({ url: "https://www.chess.com/game/live/1" }),
      chessComGame({ url: "https://www.chess.com/game/live/2", time_class: "blitz" }),
    ]);
    const app = createApp(db, client);

    const res = await request(app)
      .post("/api/import")
      .send({ username: "me", year: 2024, month: 1, categories: ["blitz"] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ imported: 2, alreadyPresent: 0 });

    const list = await request(app).get("/api/games");
    expect(list.body).toHaveLength(2);
    expect(list.body[0]).toMatchObject({ playerColor: "white", result: "win" });
  });

  it("POST /api/import returns an error and writes nothing for an unknown username", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient([chessComGame()], false));

    const res = await request(app)
      .post("/api/import")
      .send({ username: "ghost", year: 2024, month: 1, categories: ["blitz"] });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/username/i);

    const list = await request(app).get("/api/games");
    expect(list.body).toEqual([]);
  });

  it("returns a 502 (and stays responsive) when the chess.com request fails", async () => {
    const { db } = openDb(":memory:");
    const failing: ChessComClient = {
      playerExists: async () => true,
      fetchMonth: async () => {
        throw new Error("chess.com request failed (429)");
      },
    };
    const app = createApp(db, failing);

    const res = await request(app)
      .post("/api/import")
      .send({ username: "me", year: 2024, month: 1, categories: ["blitz"] });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/chess\.com|import/i);

    // The relay must not have crashed: a later request still works.
    const list = await request(app).get("/api/games");
    expect(list.status).toBe(200);
  });

  it("GET /api/settings then PUT then GET round-trips the Player's username", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient([]));

    const initial = await request(app).get("/api/settings");
    expect(initial.status).toBe(200);
    expect(initial.body.username).toBeNull();

    const put = await request(app).put("/api/settings").send({ username: "magnus" });
    expect(put.status).toBe(200);

    const after = await request(app).get("/api/settings");
    expect(after.body.username).toBe("magnus");
  });

  it("POST /api/import reports zero with a clear message for an empty month", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient([]));

    const res = await request(app)
      .post("/api/import")
      .send({ username: "me", year: 2024, month: 3, categories: ["blitz"] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ imported: 0, alreadyPresent: 0 });
    expect(res.body.message).toMatch(/no games found/i);
  });
});

describe("move habits API", () => {
  it("GET /api/move-habits returns a Position's candidate Moves for a side, with counters and win rate", async () => {
    const { db } = openDb(":memory:");
    // Two White games sharing 1. e4 — one win, one loss → win rate 0.5, both blitz.
    for (const [gameUrl, result] of [
      ["u1", "win"],
      ["u2", "loss"],
    ] as const) {
      const g = db
        .insert(games)
        .values({
          gameUrl,
          pgn: "1. e4 e5",
          opponent: "o",
          playerColor: "white",
          result,
          date: "2026-01-01",
          timeControlCategory: "blitz",
        })
        .returning()
        .get();
      recordMoveHabits(db, g);
    }
    const app = createApp(db, fakeClient([]));

    const res = await request(app)
      .get("/api/move-habits")
      .query({ side: "white", fen: START });

    expect(res.status).toBe(200);
    const e4 = res.body.candidates.find((c: { san: string }) => c.san === "e4");
    expect(e4).toMatchObject({ count: 2, win: 1, draw: 0, loss: 1, winRate: 0.5 });
    expect(e4.byCategory).toMatchObject({ bullet: 0, blitz: 2, rapid: 0, daily: 0 });
  });
});

describe("stats API", () => {
  const game = (over: Record<string, unknown>) => ({
    gameUrl: `https://chess.com/g/${Math.random()}`,
    pgn: "1. e4 e5",
    opponent: "o",
    playerColor: "white" as const,
    result: "win" as const,
    date: "2026-01-01",
    timeControlCategory: "blitz" as const,
    ...over,
  });

  it("GET /api/stats returns the history-wide summary (total, per cadence, per side)", async () => {
    const { db } = openDb(":memory:");
    db.insert(games).values(game({ result: "win", timeControlCategory: "blitz", playerColor: "white" })).run();
    db.insert(games).values(game({ result: "loss", timeControlCategory: "bullet", playerColor: "black" })).run();
    const app = createApp(db, fakeClient([]));

    const res = await request(app).get("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.total).toMatchObject({ games: 2, win: 1, loss: 1, winRate: 0.5 });
    expect(res.body.byCategory.blitz).toMatchObject({ games: 1, win: 1 });
    expect(res.body.byCategory.rapid).toMatchObject({ games: 0, winRate: null });
    expect(res.body.bySide.black).toMatchObject({ games: 1, loss: 1 });
  });

  it("GET /api/stats returns zeros with a null rate on an empty history", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient([]));

    const res = await request(app).get("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.total).toEqual({ games: 0, win: 0, draw: 0, loss: 0, winRate: null });
  });
});
