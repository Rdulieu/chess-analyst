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

describe("sealing over HTTP", () => {
  const seal = (
    app: ReturnType<typeof appWithGame>["app"],
    gameId: number,
    profileId: number,
    body: Record<string, unknown> = { engineSeen: false },
  ) => request(app).post(`/api/personal/${gameId}/seal?profileId=${profileId}`).send(body);

  it("seals a reading that has something in it, and answers it sealed and labelled", async () => {
    const { app, profileId, game } = appWithGame();
    await request(app)
      .put(`/api/personal/${game.id}/marks/3?profileId=${profileId}`)
      .send({ declaredSeverity: "mistake" });

    const res = await seal(app, game.id, profileId);

    expect(res.status).toBe(200);
    expect(res.body.sealedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(res.body.engineSeenBeforeSeal).toBe(false);
  });

  it("refuses an empty reading with an explicit business error, not a silent failure", async () => {
    const { app, profileId, game } = appWithGame();

    const res = await seal(app, game.id, profileId);

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe("empty");
    expect(res.body.error).toMatch(/vide/i);
  });

  it("refuses to seal twice with an explicit business error", async () => {
    const { app, profileId, game } = appWithGame();
    await request(app)
      .put(`/api/personal/${game.id}/marks/3?profileId=${profileId}`)
      .send({ declaredSeverity: "mistake" });
    await seal(app, game.id, profileId);

    const res = await seal(app, game.id, profileId);

    expect(res.status).toBe(409);
    expect(res.body.reason).toBe("already-sealed");
  });

  it("records the provenance the client reports, per Game and not globally", async () => {
    const { app, db, profileId } = appWithGame();
    const informed = db
      .insert(games)
      // A second Game under the same Profile: the pair (profile, url) is unique,
      // so it needs its own url.
      .values({ ...morphyGame(profileId), gameUrl: "https://chess.com/g/personal/informed" })
      .returning()
      .get();
    const blind = db.select().from(games).all()[0];

    for (const game of [blind, informed]) {
      await request(app)
        .put(`/api/personal/${game.id}/marks/3?profileId=${profileId}`)
        .send({ declaredSeverity: "sound" });
    }
    await seal(app, blind.id, profileId, { engineSeen: false });
    await seal(app, informed.id, profileId, { engineSeen: true });

    const read = async (id: number) =>
      (await request(app).get(`/api/personal/${id}?profileId=${profileId}`)).body;
    // Seeing the engine on one Game says nothing about another: the provenance
    // belongs to the reading, not to the session.
    expect((await read(blind.id)).engineSeenBeforeSeal).toBe(false);
    expect((await read(informed.id)).engineSeenBeforeSeal).toBe(true);
  });

  it("refuses a seal that does not say whether the engine had been shown", async () => {
    const { app, profileId, game } = appWithGame();
    await request(app)
      .put(`/api/personal/${game.id}/marks/3?profileId=${profileId}`)
      .send({ declaredSeverity: "mistake" });

    // The provenance is not optional and has no safe default: silently recording
    // "not seen" would let a caller launder an informed reading into a blind one.
    const res = await seal(app, game.id, profileId, {});

    expect(res.status).toBe(400);
  });

  it("offers no route that unseals a reading", async () => {
    const { app, profileId, game } = appWithGame();
    await request(app)
      .put(`/api/personal/${game.id}/marks/3?profileId=${profileId}`)
      .send({ declaredSeverity: "mistake" });
    await seal(app, game.id, profileId);

    for (const attempt of [
      request(app).delete(`/api/personal/${game.id}/seal?profileId=${profileId}`),
      request(app).post(`/api/personal/${game.id}/unseal?profileId=${profileId}`),
      request(app)
        .put(`/api/personal/${game.id}?profileId=${profileId}`)
        .send({ sealedAt: null }),
    ]) {
      expect((await attempt).status).toBe(404);
    }
    const still = await request(app).get(`/api/personal/${game.id}?profileId=${profileId}`);
    expect(still.body.sealedAt).not.toBeNull();
  });

  it("carries a write after the seal to the posterior layer, and reports both layers", async () => {
    const { app, profileId, game } = appWithGame();
    const mark = (body: Record<string, unknown>) =>
      request(app).put(`/api/personal/${game.id}/marks/3?profileId=${profileId}`).send(body);
    await mark({ declaredSeverity: "sound" });
    await seal(app, game.id, profileId);

    const after = await mark({ declaredSeverity: "blunder" });

    expect(after.body.marks).toEqual([
      { ply: 3, declaredSeverity: "sound", note: null, keyMoment: false, posterior: false },
      { ply: 3, declaredSeverity: "blunder", note: null, keyMoment: false, posterior: true },
    ]);
  });

});

describe("a Game says whether it carries a reading", () => {
  it("reports no reading, a reading in progress, and a sealed one — told apart", async () => {
    const { app, db, profileId, game: untouched } = appWithGame();
    const open = db
      .insert(games)
      .values({ ...morphyGame(profileId), gameUrl: "https://chess.com/g/personal/open" })
      .returning()
      .get();
    const closed = db
      .insert(games)
      .values({ ...morphyGame(profileId), gameUrl: "https://chess.com/g/personal/closed" })
      .returning()
      .get();

    for (const game of [open, closed]) {
      await request(app)
        .put(`/api/personal/${game.id}/marks/3?profileId=${profileId}`)
        .send({ declaredSeverity: "sound" });
    }
    await request(app)
      .post(`/api/personal/${closed.id}/seal?profileId=${profileId}`)
      .send({ engineSeen: false });

    const listed = (await request(app).get(`/api/games?profileId=${profileId}`)).body as {
      id: number;
      reading: string;
    }[];
    const state = new Map(listed.map((g) => [g.id, g.reading]));
    // Three states, never two: "in progress" and "sealed" are where the Player
    // resumes versus where they are done, which is the whole point of showing it.
    expect(state.get(untouched.id)).toBe("none");
    expect(state.get(open.id)).toBe("open");
    expect(state.get(closed.id)).toBe("sealed");
  });

  it("says it on a single Game's detail too, so the Analyse page needs no second request", async () => {
    const { app, profileId, game } = appWithGame();

    expect((await request(app).get(`/api/games/${game.id}`)).body.reading).toBe("none");
    await request(app)
      .put(`/api/personal/${game.id}/marks/3?profileId=${profileId}`)
      .send({ keyMoment: true });
    expect((await request(app).get(`/api/games/${game.id}`)).body.reading).toBe("open");
  });

  it("counts a reading whose only marks are posterior as still a reading", async () => {
    // A sealed reading stays sealed whatever is added on top of it.
    const { app, profileId, game } = appWithGame();
    await request(app)
      .put(`/api/personal/${game.id}/marks/3?profileId=${profileId}`)
      .send({ declaredSeverity: "sound" });
    await request(app)
      .post(`/api/personal/${game.id}/seal?profileId=${profileId}`)
      .send({ engineSeen: false });
    await request(app)
      .put(`/api/personal/${game.id}/marks/9?profileId=${profileId}`)
      .send({ note: "vu après coup" });

    expect((await request(app).get(`/api/games/${game.id}`)).body.reading).toBe("sealed");
  });
});
