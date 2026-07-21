import { describe, it, expect } from "vitest";
import request from "supertest";
import { openDb } from "../src/db";
import { seedFixtureIfEmpty } from "../src/seed";
import { createApp } from "../src/app";

function appWithFixture() {
  const { db } = openDb(":memory:");
  seedFixtureIfEmpty(db);
  return createApp(db);
}

describe("games API", () => {
  it("GET /api/games returns the seeded fixture Game", async () => {
    const app = appWithFixture();

    const res = await request(app).get("/api/games");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ result: "1-0", timeControlCategory: "rapid" });
    expect(res.body[0].pgn).toContain("Morphy");
  });

  it("GET /api/games/:id returns that Game's full detail", async () => {
    const app = appWithFixture();
    const list = await request(app).get("/api/games");
    const id = list.body[0].id as number;

    const res = await request(app).get(`/api/games/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, opponent: "Duke Karl / Count Isouard" });
    expect(res.body.pgn).toContain("O-O-O");
  });

  it("GET /api/games/:id returns 404 for an unknown id", async () => {
    const app = appWithFixture();

    const res = await request(app).get("/api/games/9999");

    expect(res.status).toBe(404);
  });
});
