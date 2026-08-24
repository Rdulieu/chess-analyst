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

  it("takes a Note, and takes it back, without disturbing the verdict beside it", async () => {
    const { app, profileId, game } = appWithGame();
    const mark = (body: Record<string, unknown>) =>
      request(app).put(`/api/personal/${game.id}/marks/3?profileId=${profileId}`).send(body);

    await mark({ declaredSeverity: "blunder" });
    const written = await mark({ note: "je n'ai pas vu le clouage" });
    expect(written.body.marks[0]).toEqual({
      ply: 3,
      declaredSeverity: "blunder",
      note: "je n'ai pas vu le clouage",
      keyMoment: false,
      posterior: false,
    });

    const erased = await mark({ note: null });
    expect(erased.body.marks[0]).toMatchObject({ declaredSeverity: "blunder", note: null });
  });

  it("takes a Note on the starting Position, which is how the Game as a whole is commented", async () => {
    const { app, profileId, game } = appWithGame();

    const res = await request(app)
      .put(`/api/personal/${game.id}/marks/0?profileId=${profileId}`)
      .send({ note: "Partie où je me perds dès la sortie d'ouverture." });

    expect(res.status).toBe(200);
    expect(res.body.marks).toEqual([
      {
        ply: 0,
        declaredSeverity: null,
        note: "Partie où je me perds dès la sortie d'ouverture.",
        keyMoment: false,
        posterior: false,
      },
    ]);
  });

  it("refuses a Note that is not text", async () => {
    const { app, profileId, game } = appWithGame();

    const res = await request(app)
      .put(`/api/personal/${game.id}/marks/3?profileId=${profileId}`)
      .send({ note: { oops: true } });

    expect(res.status).toBe(400);
  });

  it("takes a Key moment, takes it back, and leaves the verdict and Note beside it alone", async () => {
    const { app, profileId, game } = appWithGame();
    const mark = (body: Record<string, unknown>) =>
      request(app).put(`/api/personal/${game.id}/marks/21?profileId=${profileId}`).send(body);

    await mark({ declaredSeverity: "mistake", note: "je perds le fil ici" });
    const pivot = await mark({ keyMoment: true });
    expect(pivot.body.marks[0]).toEqual({
      ply: 21,
      declaredSeverity: "mistake",
      note: "je perds le fil ici",
      keyMoment: true,
      posterior: false,
    });

    const removed = await mark({ keyMoment: false });
    expect(removed.body.marks[0]).toMatchObject({
      keyMoment: false,
      declaredSeverity: "mistake",
      note: "je perds le fil ici",
    });
  });

  it("refuses a Key moment that is not a yes or a no", async () => {
    const { app, profileId, game } = appWithGame();

    const res = await request(app)
      .put(`/api/personal/${game.id}/marks/21?profileId=${profileId}`)
      .send({ keyMoment: "oui" });

    expect(res.status).toBe(400);
  });
});
