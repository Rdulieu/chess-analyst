import { describe, it, expect } from "vitest";
import request from "supertest";
import { openDb } from "../src/db";
import { games } from "../src/db/schema";
import { createApp } from "../src/app";
import { morphyGame, seedProfile, fakeRegistry } from "./fixtures";

/**
 * The HTTP contract of the `Personal analysis` (US-16a). Scoped to the `Profile`
 * through the mechanism every other read already uses (ADR-0014): a reading is
 * about one player's Game, and an answer that named no Profile would be nobody's.
 */
function appWithGame() {
  const { db } = openDb(":memory:");
  const profileId = seedProfile(db);
  const game = db.insert(games).values(morphyGame(profileId)).returning().get();
  return { app: createApp(db, fakeRegistry()), db, profileId, game };
}

describe("Personal analysis API", () => {
  it("answers an empty reading for a Game nobody has read — not a 404", async () => {
    const { app, profileId, game } = appWithGame();

    const res = await request(app).get(`/api/personal/${game.id}?profileId=${profileId}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      gameId: game.id,
      sealedAt: null,
      engineSeenBeforeSeal: null,
      marks: [],
    });
  });

  it("takes a verdict on a ply and answers the whole reading back", async () => {
    const { app, profileId, game } = appWithGame();

    const res = await request(app)
      .put(`/api/personal/${game.id}/marks/7?profileId=${profileId}`)
      .send({ declaredSeverity: "mistake" });

    expect(res.status).toBe(200);
    expect(res.body.marks).toEqual([
      { ply: 7, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false },
    ]);
  });

  it("refuses a request that names no Profile, and one that names an unknown one", async () => {
    const { app, game } = appWithGame();

    expect((await request(app).get(`/api/personal/${game.id}`)).status).toBe(400);
    expect((await request(app).get(`/api/personal/${game.id}?profileId=999`)).status).toBe(404);
  });

  it("refuses to read one Profile's Game under another Profile's name", async () => {
    const { app, db, game } = appWithGame();
    const other = seedProfile(db, "AFriend");

    const res = await request(app).get(`/api/personal/${game.id}?profileId=${other}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/partie/i);
  });

  it("refuses a value that is not one of the five Declared severities", async () => {
    const { app, profileId, game } = appWithGame();

    const res = await request(app)
      .put(`/api/personal/${game.id}/marks/7?profileId=${profileId}`)
      .send({ declaredSeverity: "catastrophe" });

    expect(res.status).toBe(400);
  });

  it("answers 404 for a Game that does not exist", async () => {
    const { app, profileId } = appWithGame();

    expect((await request(app).get(`/api/personal/4242?profileId=${profileId}`)).status).toBe(404);
  });
});
