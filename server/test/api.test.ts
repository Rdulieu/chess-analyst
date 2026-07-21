import { describe, it, expect } from "vitest";
import request from "supertest";
import { openDb } from "../src/db";
import { games } from "../src/db/schema";
import { createApp } from "../src/app";
import { MORPHY_GAME } from "./fixtures";
import type { ChessComClient, ChessComGame } from "../src/chesscom";

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
