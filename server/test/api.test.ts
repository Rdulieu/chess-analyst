import { describe, it, expect } from "vitest";
import request from "supertest";
import { openDb } from "../src/db";
import { games } from "../src/db/schema";
import { createApp } from "../src/app";
import { MORPHY_GAME } from "./fixtures";

function appWithGame() {
  const { db } = openDb(":memory:");
  db.insert(games).values(MORPHY_GAME).run();
  return createApp(db);
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
    const app = createApp(db);

    const res = await request(app).get("/api/games");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
