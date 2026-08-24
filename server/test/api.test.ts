import { describe, it, expect } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { openDb } from "../src/db";
import { gamePositions } from "../src/chess/positions";
import { fixtureBestLine } from "../src/engine/fixture";
import { games, evaluations } from "../src/db/schema";
import { createApp } from "../src/app";
import { createFixtureEngine } from "../src/engine/fixture";
import { recordMoveHabits } from "../src/move-habits/precompute";
import {
  importedGame,
  fakeClient,
  fakeRegistry,
  morphyGame,
  seedProfile,
  type PlayerAnswer,
} from "./fixtures";
import { monthsInRange } from "../src/platform";
import type { PlatformClient } from "../src/platform";

/** 4-field FEN of the standard starting Position. */
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3";

/** Polls the Import status until the pass has finished, then returns its body. */
async function importDone(app: Parameters<typeof request>[0]) {
  for (let i = 0; i < 100; i++) {
    const res = await request(app).get("/api/import/status");
    if (!res.body.running) return res.body;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("Import never finished");
}

/**
 * The id of the one `Profile` a fresh in-memory database holds: the tests below
 * seed exactly one, and it is what every scoped read must name (ADR-0014).
 */
const SOLE_PROFILE = 1;

/** `GET /api/games` **about a Profile** — there is no unscoped Game list. */
const gamesOf = (app: Parameters<typeof request>[0], profileId: number = SOLE_PROFILE) =>
  request(app).get(`/api/games?profileId=${profileId}`);

function appWithGame() {
  const { db } = openDb(":memory:");
  db.insert(games)
    .values(morphyGame(seedProfile(db)))
    .run();
  return createApp(db, fakeRegistry({}));
}

describe("games API", () => {
  it("GET /api/games returns the stored Games with their Game fields", async () => {
    const app = appWithGame();

    const res = await gamesOf(app);

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
    const list = await gamesOf(app);
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

  it("GET /api/games returns an empty list for a Profile that holds no Game yet", async () => {
    const { db } = openDb(":memory:");
    seedProfile(db);
    const app = createApp(db, fakeRegistry({}));

    const res = await gamesOf(app);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("GET /api/games/:id/annotations returns 404 for an unknown id", async () => {
    const app = appWithGame();

    const res = await request(app).get("/api/games/9999/annotations");

    expect(res.status).toBe(404);
  });

  it("GET /api/games/:id/annotations reports analyzed:false and no plies for a not-yet-analyzed Game", async () => {
    const app = appWithGame();
    const list = await gamesOf(app);
    const id = list.body[0].id as number;

    const res = await request(app).get(`/api/games/${id}/annotations`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ analyzed: false, plies: [], regime: null, recap: null });
  });

  it("GET /api/games/:id/annotations returns the per-ply annotations for an analyzed Game", async () => {
    const { db } = openDb(":memory:");
    const game = db
      .insert(games)
      .values({
        profileId: seedProfile(db),
        gameUrl: "https://www.chess.com/game/live/annot-1",
        pgn: "1. e4 e5",
        opponent: "opp",
        playerColor: "white",
        result: "win",
        date: "2026-01-01",
        timeControlCategory: "blitz",
        analyzed: true,
      })
      .returning()
      .get();
    db.insert(evaluations)
      .values(
        gamePositions(game.pgn).map((fen, ply) => ({
          gameId: game.id,
          ply,
          fen,
          cp: 0,
          mate: null,
          pv: fixtureBestLine(fen).join(" "),
        })),
      )
      .run();
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app).get(`/api/games/${game.id}/annotations`);

    expect(res.status).toBe(200);
    expect(res.body.analyzed).toBe(true);
    expect(res.body.plies).toHaveLength(3);
    expect(res.body.plies[0]).toMatchObject({ ply: 0, severity: null });
    // The `Best line` crosses the wire as a line, ply by ply — not as a single
    // best move (ADR-0016), and not left for the client to re-derive.
    expect(res.body.plies.map((p: { bestLine: string[] }) => p.bestLine)).toEqual(
      gamePositions(game.pgn).map((fen) => fixtureBestLine(fen)),
    );
  });
});

describe("analysis API", () => {
  let seq = 0;
  /** An app over a fresh store holding the given Games; the store is returned
   *  too, so a second app can be built over it (restart scenarios). */
  function appAndStore(pgns: string[]) {
    const { db } = openDb(":memory:");
    for (const pgn of pgns) {
      db.insert(games)
        .values({
          profileId: seedProfile(db),
          gameUrl: `https://www.chess.com/game/live/${seq++}`,
          pgn,
          opponent: "o",
          playerColor: "white",
          result: "win",
          date: "2026-01-01",
          timeControlCategory: "blitz",
        })
        .run();
    }
    return { app: createApp(db, fakeRegistry({}), createFixtureEngine()), db };
  }

  const appWithGames = (pgns: string[]) => appAndStore(pgns).app;

  /** Starts a pass **for a Profile** — there is no unscoped way to start one. */
  const startPass = (
    app: Parameters<typeof request>[0],
    gameIds: number[],
    profileId: number = SOLE_PROFILE,
  ) => request(app).post(`/api/analyze?profileId=${profileId}`).send({ gameIds });

  /** `GET /api/analyze/status` about one Profile's own last pass. */
  const statusOf = (app: Parameters<typeof request>[0], profileId: number = SOLE_PROFILE) =>
    request(app).get(`/api/analyze/status?profileId=${profileId}`);

  /** Polls the status endpoint until the pass reports it is no longer running. */
  async function waitDone(app: Parameters<typeof request>[0], profileId: number = SOLE_PROFILE) {
    for (let i = 0; i < 50; i++) {
      const res = await statusOf(app, profileId);
      if (!res.body.running) return res.body;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error("analysis did not finish in time");
  }

  const idsOf = async (app: ReturnType<typeof appWithGames>) =>
    (await gamesOf(app)).body.map((g: { id: number }) => g.id);

  it("POST /api/analyze refuses a request naming no Profile, or an unknown one", async () => {
    const app = appWithGames(["1. e4 e5"]);
    const ids = await idsOf(app);

    // Engine time is the most expensive thing this app spends: a pass that does
    // not say whose Games it is for is not a pass to open (ADR-0014).
    expect((await request(app).post("/api/analyze").send({ gameIds: ids })).status).toBe(400);
    expect(
      (await request(app).post("/api/analyze?profileId=999").send({ gameIds: ids })).status,
    ).toBe(404);
  });

  /**
   * Two Profiles, one Game each — the shape every scoping question needs: the
   * Game whose analysis is asked for, and the one that must be left alone.
   */
  function appWithTwoProfiles() {
    const { db } = openDb(":memory:");
    const mine = seedProfile(db, "DudulSmash");
    const theirs = seedProfile(db, "Hikaru");
    const seeded = [mine, theirs].map((profileId) =>
      db
        .insert(games)
        .values({
          profileId,
          gameUrl: `https://www.chess.com/game/live/${seq++}`,
          pgn: "1. e4 e5",
          opponent: "o",
          playerColor: "white",
          result: "win",
          date: "2026-01-01",
          timeControlCategory: "blitz",
        })
        .returning()
        .get(),
    );
    return {
      app: createApp(db, fakeRegistry({}), createFixtureEngine()),
      mine,
      theirs,
      myGame: seeded[0],
      theirGame: seeded[1],
    };
  }

  it("POST /api/analyze refuses to spend engine time on a Game the named Profile does not own", async () => {
    const { app, mine, theirs, theirGame } = appWithTwoProfiles();

    const res = await startPass(app, [theirGame.id], mine);

    // Refused outright rather than quietly narrowed: a selection naming someone
    // else's Game is a caller's mistake, and silently analyzing a subset would
    // leave the Player thinking the rest was covered (ADR-0014).
    expect(res.status).toBe(400);
    expect((await gamesOf(app, theirs)).body[0].analyzed).toBe(false);
  });

  it("GET /api/analyze/status reports each Profile's OWN last pass, not simply the last one", async () => {
    const { app, mine, theirs, myGame } = appWithTwoProfiles();

    await startPass(app, [myGame.id], mine);
    const finished = await waitDone(app, mine);
    expect(finished).toMatchObject({ games: 1, done: 3, outcome: "completed" });

    // The other Profile has run nothing. Its page must say so — reading its
    // neighbour's summary would be the blend this whole story removes.
    expect((await statusOf(app, theirs)).body).toMatchObject({
      running: false,
      games: 0,
      total: 0,
      done: 0,
      outcome: null,
    });
  });

  it("a pass run for one Profile leaves the other's analyzed count exactly where it was", async () => {
    const { app, mine, theirs, myGame } = appWithTwoProfiles();
    const countOf = async (id: number) => (await request(app).get(`/api/profiles/${id}`)).body;

    expect(await countOf(theirs)).toMatchObject({ games: 1, analyzed: 0 });

    await startPass(app, [myGame.id], mine);
    await waitDone(app, mine);

    expect(await countOf(mine)).toMatchObject({ games: 1, analyzed: 1 });
    expect(await countOf(theirs)).toMatchObject({ games: 1, analyzed: 0 });
  });

  it("re-running a pass on a Profile skips its already-analyzed Games rather than recomputing them", async () => {
    const { app, mine, myGame } = appWithTwoProfiles();

    await startPass(app, [myGame.id], mine);
    expect(await waitDone(app, mine)).toMatchObject({ done: 3, outcome: "completed" });
    const stored = (await request(app).get(`/api/games/${myGame.id}/annotations`)).body;

    // Incremental, as ADR-0011 has it: no pass is opened at all, and the Game's
    // Evaluations are exactly the ones the first pass produced.
    expect((await startPass(app, [myGame.id], mine)).body).toMatchObject({ started: false });
    expect((await request(app).get(`/api/games/${myGame.id}/annotations`)).body).toEqual(stored);
  });

  it("acknowledging one Profile's summary leaves the other Profile's own summary standing", async () => {
    const { app, mine, theirs, myGame, theirGame } = appWithTwoProfiles();
    await startPass(app, [myGame.id], mine);
    await waitDone(app, mine);
    await startPass(app, [theirGame.id], theirs);
    await waitDone(app, theirs);

    await request(app).post(`/api/analyze/acknowledge?profileId=${mine}`);

    expect((await statusOf(app, mine)).body).toMatchObject({ acknowledged: true });
    // Dismissing a summary is one Player's gesture on one Player's screen.
    expect((await statusOf(app, theirs)).body).toMatchObject({
      acknowledged: false,
      outcome: "completed",
      games: 1,
    });
  });

  it("GET /api/analyze/status refuses to answer without a Profile, or for an unknown one", async () => {
    const app = appWithGames(["1. e4 e5"]);

    expect((await request(app).get("/api/analyze/status")).status).toBe(400);
    expect((await request(app).get("/api/analyze/status?profileId=999")).status).toBe(404);
  });

  it("POST /api/analyze starts a background pass (202) and /status advances in Positions, reporting how many Games it covers", async () => {
    const app = appWithGames(["1. e4 e5", "1. d4 d5"]); // 2 Games, 3 Positions each

    const started = await startPass(app, await idsOf(app));
    expect(started.status).toBe(202);
    expect(started.body).toMatchObject({ running: true, total: 6, games: 2 });

    expect(await waitDone(app)).toEqual({
      running: false,
      total: 6,
      done: 6,
      games: 2,
      acknowledged: false,
      outcome: "completed",
      error: null,
    });
  });

  it("re-analyzing an already-analyzed selection opens no new pass — the last one is still reported", async () => {
    const app = appWithGames(["1. e4 e5"]);
    const ids = await idsOf(app);
    await startPass(app, ids);
    const finished = await waitDone(app);

    const again = await startPass(app, ids);
    expect(again.status).toBe(202);
    // An empty pass is not a pass: the previous one is reported, untouched.
    expect(again.body).toEqual({ ...finished, started: false });
  });

  it("POST /api/analyze/acknowledge marks the last pass as seen, and is harmless twice", async () => {
    const app = appWithGames(["1. e4 e5"]);
    await startPass(app, await idsOf(app));
    expect(await waitDone(app)).toMatchObject({ acknowledged: false });

    expect(
      (await request(app).post(`/api/analyze/acknowledge?profileId=${SOLE_PROFILE}`)).status,
    ).toBe(204);
    expect((await statusOf(app)).body).toMatchObject({ acknowledged: true, done: 3, games: 1 });

    expect(
      (await request(app).post(`/api/analyze/acknowledge?profileId=${SOLE_PROFILE}`)).status,
    ).toBe(204);
    expect((await statusOf(app)).body).toMatchObject({ acknowledged: true });
  });

  it("POST /api/analyze says whether it actually started a pass, so 'nothing to do' is not guesswork", async () => {
    const app = appWithGames(["1. e4 e5"]);
    const ids = await idsOf(app);

    expect((await startPass(app, ids)).body).toMatchObject({ started: true });
    await waitDone(app);

    expect((await startPass(app, ids)).body).toMatchObject({ started: false });
  });

  it("GET /api/analyze/status reports the last pass to a freshly built app (it outlives the process)", async () => {
    const { app, db } = appAndStore(["1. e4 e5"]);
    await startPass(app, await idsOf(app));
    await waitDone(app);

    // A second app over the same store — as after a restart.
    const restarted = createApp(db, fakeRegistry({}), createFixtureEngine());
    expect((await statusOf(restarted)).body).toEqual({
      running: false,
      total: 3,
      done: 3,
      games: 1,
      acknowledged: false,
      outcome: "completed",
      error: null,
    });
  });

  it("GET /api/games exposes the analyzed flag — false before, true after the pass", async () => {
    const app = appWithGames(["1. e4 e5"]);
    const before = await gamesOf(app);
    expect(before.body[0].analyzed).toBe(false);

    await startPass(app, [before.body[0].id]);
    await waitDone(app);

    const after = await gamesOf(app);
    expect(after.body[0].analyzed).toBe(true);
  });
});

describe("openings API", () => {
  function openingGame(profileId: number, over: Partial<import("../src/db/schema").NewGame> = {}) {
    return {
      gameUrl: `https://www.chess.com/game/live/${seqUrl++}`,
      profileId,
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
    const owner = seedProfile(db);
    db.insert(games)
      .values([
        openingGame(owner, { result: "win" }),
        openingGame(owner, { result: "loss" }),
        openingGame(owner, { eco: "C50", openingName: "Italian Game", result: "win" }),
      ])
      .run();
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app).get(`/api/openings?profileId=${owner}`);

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

  it("GET /api/openings returns { openings: [] } for a Profile with no Game", async () => {
    const { db } = openDb(":memory:");
    const owner = seedProfile(db);
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app).get(`/api/openings?profileId=${owner}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ openings: [] });
  });
});

describe("danger API", () => {
  it("GET /api/danger returns the recurring Danger position entries", async () => {
    const { db } = openDb(":memory:");
    const owner = seedProfile(db);
    db.insert(games)
      .values(
        [1, 2].map((n) => ({
          profileId: owner,
          gameUrl: `https://www.chess.com/game/live/${n}`,
          pgn: "1. e4",
          opponent: "opp",
          playerColor: "white" as const,
          result: "win" as const,
          date: "2026-01-01",
          timeControlCategory: "blitz" as const,
          analyzed: true,
        })),
      )
      .run();
    db.insert(evaluations)
      .values(
        [1, 2].flatMap((gameId) =>
          gamePositions("1. e4").map((fen, ply) => ({
            gameId,
            ply,
            fen,
            cp: 0,
            pv: fixtureBestLine(fen).join(" "),
          })),
        ),
      )
      .run();
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app).get(`/api/danger?profileId=${owner}`);

    expect(res.status).toBe(200);
    expect(res.body.dangers).toEqual([
      { fen: AFTER_E4, reached: 2, seriousErrors: 0, proportion: 0 },
    ]);
  });

  it("GET /api/danger states how many Games are analyzed, so an empty list can be read", async () => {
    const { db } = openDb(":memory:");
    const owner = seedProfile(db);
    db.insert(games)
      .values(
        [1, 2].map((n) => ({
          profileId: owner,
          gameUrl: `https://www.chess.com/game/live/${n}`,
          pgn: "1. e4",
          opponent: "opp",
          playerColor: "white" as const,
          result: "win" as const,
          date: "2026-01-01",
          timeControlCategory: "blitz" as const,
          analyzed: n === 1,
        })),
      )
      .run();
    db.insert(evaluations)
      .values(
        gamePositions("1. e4").map((fen, ply) => ({
          gameId: 1,
          ply,
          fen,
          cp: 0,
          pv: fixtureBestLine(fen).join(" "),
        })),
      )
      .run();
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app).get(`/api/danger?profileId=${owner}`);

    // One analyzed Game reaches no Position twice, so the list is empty while
    // an analysis has taken place — a different state from "nothing analyzed".
    expect(res.body).toEqual({ dangers: [], analyzedGames: 1 });
  });

  it("GET /api/danger returns no entry and no analyzed Game for a Profile with no Game", async () => {
    const { db } = openDb(":memory:");
    const owner = seedProfile(db);
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app).get(`/api/danger?profileId=${owner}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ dangers: [], analyzedGames: 0 });
  });
});

describe("import API", () => {
  it("POST /api/import writes the Games under the Profile it names, and no other", async () => {
    const { db } = openDb(":memory:");
    const mine = seedProfile(db, "DudulSmash");
    const friend = seedProfile(db, "Friend");
    const app = createApp(db, fakeRegistry({ "2024-01": [importedGame()] }));

    const res = await request(app)
      .post("/api/import")
      .send({
        profileId: mine,
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 1 },
        categories: ["blitz"],
      });

    expect(res.status).toBe(202);
    await importDone(app);

    const rows = db.select().from(games).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].profileId).toBe(mine);
    expect(db.select().from(games).where(eq(games.profileId, friend)).all()).toEqual([]);
  });

  it("re-imports an overlapping range under one Profile without adding a duplicate", async () => {
    const { db } = openDb(":memory:");
    const mine = seedProfile(db, "me");
    const app = createApp(
      db,
      fakeRegistry({
        "2024-01": [importedGame({ gameUrl: "https://www.chess.com/game/live/7" })],
        "2024-02": [importedGame({ gameUrl: "https://www.chess.com/game/live/8" })],
      }),
    );
    const run = async (fromMonth: number) => {
      await request(app)
        .post("/api/import")
        .send({
          profileId: mine,
          from: { year: 2024, month: fromMonth },
          to: { year: 2024, month: 2 },
          categories: ["blitz"],
        });
      return importDone(app);
    };

    await run(1);
    const again = await run(2); // February a second time
    expect(again.result.imported).toBe(0);
    expect(again.result.alreadyPresent).toBe(1);
    expect(db.select().from(games).all()).toHaveLength(2);
  });

  it("accepts the same game URL under two Profiles, each row from its own Player's side", async () => {
    const { db } = openDb(":memory:");
    const white = seedProfile(db, "me");
    const black = seedProfile(db, "opp");
    // One match between the two followed accounts — ADR-0014's two rows, not a
    // dedup bug: each Profile records it as ITS Player played it.
    const app = createApp(
      db,
      // The adapter answers from the asked account's point of view, which is
      // precisely what makes the two rows differ rather than collide.
      fakeRegistry({
        "2024-01": (username) => [
          importedGame({
            gameUrl: "https://www.chess.com/game/live/42",
            playerColor: username === "me" ? "white" : "black",
            result: username === "me" ? "win" : "loss",
            opponent: username === "me" ? "opp" : "me",
          }),
        ],
      }),
    );
    const importFor = async (profileId: number) => {
      await request(app)
        .post("/api/import")
        .send({
          profileId,
          from: { year: 2024, month: 1 },
          to: { year: 2024, month: 1 },
          categories: ["blitz"],
        });
      return importDone(app);
    };

    await importFor(white);
    await importFor(black);

    const rows = db.select().from(games).all();
    expect(rows).toHaveLength(2);
    expect(rows.map((g) => g.gameUrl)).toEqual([
      "https://www.chess.com/game/live/42",
      "https://www.chess.com/game/live/42",
    ]);
    expect(rows.find((g) => g.profileId === white)).toMatchObject({
      playerColor: "white",
      result: "win",
      opponent: "opp",
    });
    expect(rows.find((g) => g.profileId === black)).toMatchObject({
      playerColor: "black",
      result: "loss",
      opponent: "me",
    });
  });

  it("POST /api/import refuses a request naming no Profile, or an unknown one, and starts nothing", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeRegistry({ "2024-01": [importedGame()] }));
    const range = {
      from: { year: 2024, month: 1 },
      to: { year: 2024, month: 1 },
      categories: ["blitz"],
    };

    const nameless = await request(app).post("/api/import").send(range);
    expect(nameless.status).toBe(400);
    expect(nameless.body.error).toMatch(/profil/i);

    // An id that names nothing is a different mistake from naming none, and
    // answers differently — 404 is "that Profile does not exist".
    const unknown = await request(app)
      .post("/api/import")
      .send({ profileId: 4242, ...range });
    expect(unknown.status).toBe(404);

    const status = await request(app).get("/api/import/status");
    expect(status.body.running).toBe(false);
    expect(db.select().from(games).all()).toEqual([]);
  });

  it("POST /api/import accepts a month range, runs it in the background, and the Games then show up in GET /api/games", async () => {
    const { db } = openDb(":memory:");
    const profileId = seedProfile(db, "me");
    const app = createApp(
      db,
      fakeRegistry({
        "2024-01": [importedGame({ gameUrl: "https://www.chess.com/game/live/1" })],
        "2024-03": [importedGame({ gameUrl: "https://www.chess.com/game/live/2" })],
      }),
    );

    const res = await request(app)
      .post("/api/import")
      .send({
        profileId,
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 3 },
        categories: ["blitz"],
      });

    // 202: the range is under way, the summary is not there yet (ADR-0010).
    expect(res.status).toBe(202);
    expect(res.body).toMatchObject({ running: true, total: 3, done: 0 });
    expect(res.body.result).toMatchObject({ imported: 0, months: [] });

    const final = await importDone(app);
    expect(final).toMatchObject({ running: false, total: 3, done: 3 });
    expect(final.result).toMatchObject({ imported: 2, alreadyPresent: 0 });

    const list = await gamesOf(app);
    expect(list.body).toHaveLength(2);
    expect(list.body[0]).toMatchObject({ playerColor: "white", result: "win" });
  });

  it("GET /api/import/status carries a line per month, a failed month included, without aborting", async () => {
    const { db } = openDb(":memory:");
    const profileId = seedProfile(db, "me");
    const app = createApp(
      db,
      fakeRegistry({
        "2024-01": [importedGame()],
        "2024-02": new Error("chess.com request failed (429)"),
        "2024-03": [importedGame()],
      }),
    );

    await request(app)
      .post("/api/import")
      .send({
        profileId,
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 3 },
        categories: ["blitz"],
      });

    const final = await importDone(app);
    // A partly successful Import is not a failed one: no global failure state.
    expect(final.running).toBe(false);
    expect(final.result.imported).toBe(2);
    expect(final.result.months).toHaveLength(3);
    expect(final.result.months[1].failure).toMatch(/429/);
    expect(final.result.months[0].failure).toBeUndefined();

    const list = await gamesOf(app);
    expect(list.body).toHaveLength(2);
  });

  it("POST /api/import rejects an inverted range with 400 and starts nothing", async () => {
    const { db } = openDb(":memory:");
    const profileId = seedProfile(db, "me");
    const app = createApp(db, fakeRegistry({ "2024-01": [importedGame()] }));

    const res = await request(app)
      .post("/api/import")
      .send({
        profileId,
        from: { year: 2024, month: 6 },
        to: { year: 2024, month: 3 },
        categories: ["blitz"],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/range|plage|month/i);

    const status = await request(app).get("/api/import/status");
    expect(status.body.running).toBe(false);
    expect((await gamesOf(app)).body).toEqual([]);
  });

  it("POST /api/import covers no month at all when the range lies entirely in the future", async () => {
    const { db } = openDb(":memory:");
    let monthsFetched = 0;
    const profileId = seedProfile(db, "me");
    const app = createApp(db, {
      chesscom: {
        fetchPlayer: async (username) => ({ username }),
        // Counts the MONTHS the range covers, which is what the assertion is
        // about: the generator is started either way, but an empty range asks
        // for nothing.
        // eslint-disable-next-line require-yield
        fetchRange: async function* (_username, from, to) {
          monthsFetched += monthsInRange(from, to).length;
        },
      },
    });
    const nextYear = new Date().getFullYear() + 1;

    await request(app)
      .post("/api/import")
      .send({
        profileId,
        from: { year: nextYear, month: 1 },
        to: { year: nextYear, month: 6 },
        categories: ["blitz"],
      });

    const final = await importDone(app);
    // No phantom months reported at zero — the range simply covers nothing.
    expect(monthsFetched).toBe(0);
    expect(final.result.months).toEqual([]);
    expect(final.result.message).toMatch(/aucune partie trouvée/i);
  });

  it("POST /api/import imposes no cap on how long a range may be", async () => {
    const { db } = openDb(":memory:");
    const profileId = seedProfile(db, "me");
    const app = createApp(db, fakeRegistry({}));

    // Rebuilding a whole history in one Import is a supported use (ADR-0010).
    const res = await request(app)
      .post("/api/import")
      .send({
        profileId,
        from: { year: 2010, month: 1 },
        to: { year: 2025, month: 12 },
        categories: ["blitz"],
      });

    expect(res.status).toBe(202);
    expect(res.body.total).toBe(192);
    await importDone(app);
  });

  it("stays responsive when the chess.com request fails", async () => {
    const { db } = openDb(":memory:");
    const failing: PlatformClient = {
      fetchPlayer: async (username) => ({ username }),
      // eslint-disable-next-line require-yield
      fetchRange: async function* () {
        throw new Error("chess.com request failed (429)");
      },
    };
    const profileId = seedProfile(db, "me");
    const app = createApp(db, { chesscom: failing });

    const res = await request(app)
      .post("/api/import")
      .send({
        profileId,
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 1 },
        categories: ["blitz"],
      });

    expect(res.status).toBe(202);
    const final = await importDone(app);
    expect(final.running).toBe(false);

    // The relay must not have crashed: a later request still works.
    const list = await gamesOf(app);
    expect(list.status).toBe(200);
  });

  it("accepts an import scoped to `classical` alone and reports zero rather than failing", async () => {
    // The category exists in the vocabulary before any Platform produces one:
    // scoping to it must run and come back empty, not be refused (US-12).
    const { db } = openDb(":memory:");
    const profileId = seedProfile(db, "me");
    const app = createApp(
      db,
      fakeRegistry({ "2024-01": [importedGame({ timeControlCategory: "blitz" })] }),
    );

    const res = await request(app)
      .post("/api/import")
      .send({
        profileId,
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 1 },
        categories: ["classical"],
      });

    expect(res.status).toBe(202);
    const final = await importDone(app);
    expect(final.result).toMatchObject({ totalFetched: 1, imported: 0, alreadyPresent: 0 });
    expect(final.result.byCategory).toEqual({
      bullet: 0,
      blitz: 0,
      rapid: 0,
      classical: 0,
      correspondence: 0,
    });
    expect(final.result.message).toMatch(/aucune partie trouvée/i);
  });

  it("POST /api/import reports zero with a message covering the whole range", async () => {
    const { db } = openDb(":memory:");
    const profileId = seedProfile(db, "me");
    const app = createApp(db, fakeRegistry({}));

    await request(app)
      .post("/api/import")
      .send({
        profileId,
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 3 },
        categories: ["blitz"],
      });

    const final = await importDone(app);
    expect(final.result).toMatchObject({ imported: 0, alreadyPresent: 0 });
    expect(final.result.message).toMatch(/aucune partie trouvée/i);
  });
});

describe("settings API", () => {
  it("GET /api/settings then PUT then GET round-trips the Player's username", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeRegistry({}));

    const initial = await request(app).get("/api/settings");
    expect(initial.status).toBe(200);
    expect(initial.body.username).toBeNull();

    const put = await request(app).put("/api/settings").send({ username: "magnus" });
    expect(put.status).toBe(200);

    const after = await request(app).get("/api/settings");
    expect(after.body.username).toBe("magnus");
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
          profileId: seedProfile(db),
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
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app)
      .get("/api/move-habits")
      .query({ profileId: SOLE_PROFILE, side: "white", fen: START });

    expect(res.status).toBe(200);
    const e4 = res.body.candidates.find((c: { san: string }) => c.san === "e4");
    expect(e4).toMatchObject({ count: 2, win: 1, draw: 0, loss: 1, winRate: 0.5 });
    expect(e4.byCategory).toMatchObject({
      bullet: 0,
      blitz: 2,
      rapid: 0,
      classical: 0,
      correspondence: 0,
    });
  });
});

describe("stats API", () => {
  // Every Game needs an owner; these tests only need *a* Player, seeded as the
  // database's first (and only) Profile.
  const game = (profileId: number, over: Record<string, unknown>) => ({
    profileId,
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
    const owner = seedProfile(db);
    db.insert(games)
      .values(game(owner, { result: "win", timeControlCategory: "blitz", playerColor: "white" }))
      .run();
    db.insert(games)
      .values(game(owner, { result: "loss", timeControlCategory: "bullet", playerColor: "black" }))
      .run();
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app).get(`/api/stats?profileId=${owner}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toMatchObject({ games: 2, win: 1, loss: 1, winRate: 0.5 });
    expect(res.body.byCategory.blitz).toMatchObject({ games: 1, win: 1 });
    expect(res.body.byCategory.rapid).toMatchObject({ games: 0, winRate: null });
    expect(res.body.bySide.black).toMatchObject({ games: 1, loss: 1 });
  });

  it("GET /api/stats returns zeros with a null rate for a Profile with no Game", async () => {
    const { db } = openDb(":memory:");
    const owner = seedProfile(db);
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app).get(`/api/stats?profileId=${owner}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toEqual({ games: 0, win: 0, draw: 0, loss: 0, winRate: null });
  });
});

/**
 * The `Platform` as a **value the code reads** rather than a word it spells
 * (ADR-0018): which site an operation talks to is resolved from the `Profile`,
 * and every message names the site actually asked for. A refusal that says
 * "chess.com" when the Player asked for Lichess is the failure this exists
 * against.
 */
describe("the Platform is resolved from the Profile", () => {
  /** Two adapters wired at once, each answering only for its own Platform. */
  const twoPlatforms = () => ({
    chesscom: fakeClient({
      "2024-01": [importedGame({ gameUrl: "https://www.chess.com/game/live/1" })],
    }),
    lichess: fakeClient(
      { "2024-01": [importedGame({ gameUrl: "https://lichess.org/abcd1234" })] },
      "Metalyst",
    ),
  });

  it("POST /api/profiles validates against the Platform the request asked for", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, twoPlatforms());

    const res = await request(app)
      .post("/api/profiles")
      .send({ platform: "lichess", username: "metalyst" });

    expect(res.status).toBe(201);
    // The canonical spelling comes from LICHESS's answer, not chess.com's.
    expect(res.body).toMatchObject({ platform: "lichess", username: "Metalyst" });
  });

  it("POST /api/profiles names the Platform it could not reach, never another one", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, {
      chesscom: fakeClient({}),
      lichess: fakeClient({}, new Error("boom")),
    });

    const res = await request(app)
      .post("/api/profiles")
      .send({ platform: "lichess", username: "metalyst" });

    expect(res.status).toBe(502);
    expect(res.body.error).toContain("lichess.org");
    expect(res.body.error).not.toContain("chess.com");
  });

  it("POST /api/profiles names the Platform an unknown account is unknown to", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, { chesscom: fakeClient({}), lichess: fakeClient({}, false) });

    const res = await request(app)
      .post("/api/profiles")
      .send({ platform: "lichess", username: "ghost" });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain("lichess.org");
  });

  it("an Import fetches through the Profile's own Platform, not the app's first one", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, twoPlatforms());
    const created = await request(app)
      .post("/api/profiles")
      .send({ platform: "lichess", username: "metalyst" });

    await request(app)
      .post("/api/import")
      .send({
        profileId: created.body.id,
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 1 },
        categories: ["blitz"],
      });
    await importDone(app);

    const list = await gamesOf(app, created.body.id);
    expect(list.body.map((g: { gameUrl: string }) => g.gameUrl)).toEqual([
      "https://lichess.org/abcd1234",
    ]);
  });

  it("refuses, loudly, a Platform this build has no adapter for — rather than fetching elsewhere", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeRegistry({})); // chess.com only

    const res = await request(app)
      .post("/api/profiles")
      .send({ platform: "lichess", username: "metalyst" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/non prise en charge/i);
    expect((await request(app).get("/api/profiles")).body).toEqual([]);
  });

  it("refuses an Import for a Profile whose Platform has no adapter, and starts nothing", async () => {
    const { db } = openDb(":memory:");
    // A Profile stored on a Platform this build cannot reach — the case a
    // downgrade or a half-applied wiring produces.
    const profileId = seedProfile(db, "Metalyst", "lichess");
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app)
      .post("/api/import")
      .send({
        profileId,
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 1 },
        categories: ["blitz"],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/non prise en charge/i);
    expect((await request(app).get("/api/import/status")).body.running).toBe(false);
  });

  it("GET /api/profiles carries each Profile's Platform, so a reader never has to assume one", async () => {
    const { db } = openDb(":memory:");
    seedProfile(db, "me", "chesscom");
    seedProfile(db, "Metalyst", "lichess");
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app).get("/api/profiles");

    expect(
      res.body.map((p: { platform: string; username: string }) => [p.platform, p.username]),
    ).toEqual([
      ["chesscom", "me"],
      ["lichess", "Metalyst"],
    ]);
  });
});

/**
 * The `Profile` — one account on one platform (CONTEXT.md, ADR-0014) — before it
 * owns anything. Creation goes through chess.com, so that what is stored is an
 * account that exists, spelled the way chess.com spells it.
 */
describe("profiles API", () => {
  /** An app whose chess.com always answers `canonical`, whatever casing is asked. */
  const appAnswering = (canonical: PlayerAnswer) =>
    createApp(openDb(":memory:").db, fakeRegistry({}, canonical));

  it("POST /api/profiles stores the account under chess.com's own spelling", async () => {
    const app = appAnswering("DudulSmash");

    const res = await request(app).post("/api/profiles").send({ username: "dudulsmash" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ platform: "chesscom", username: "DudulSmash" });
    expect(res.body.id).toBeTypeOf("number");
  });

  it("POST /api/profiles a second time selects the Profile instead of duplicating it", async () => {
    // The case the canonicalisation exists for: two spellings of one account.
    const app = appAnswering("DudulSmash");
    const first = await request(app).post("/api/profiles").send({ username: "DudulSmash" });

    const again = await request(app).post("/api/profiles").send({ username: "dudulsmash" });

    expect(again.status).toBe(200); // selected, not created
    expect(again.body.id).toBe(first.body.id);
    const list = await request(app).get("/api/profiles");
    expect(list.body).toHaveLength(1);
  });

  it("POST /api/profiles refuses a username chess.com does not know, and persists nothing", async () => {
    const app = appAnswering(false);

    const res = await request(app).post("/api/profiles").send({ username: "ghost" });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/ghost/);
    expect((await request(app).get("/api/profiles")).body).toEqual([]);
  });

  it("POST /api/profiles refuses creation when chess.com cannot be reached", async () => {
    // Never persisted, and never mistaken for a typo: a Profile that was not
    // validated must not blend into the list looking like the others (US-11).
    const app = appAnswering(new Error("connect ECONNREFUSED"));

    const res = await request(app).post("/api/profiles").send({ username: "dudulsmash" });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/chess\.com/i);
    expect((await request(app).get("/api/profiles")).body).toEqual([]);
  });

  it("GET /api/profiles lists every Profile with its platform and username", async () => {
    const { db } = openDb(":memory:");
    for (const name of ["DudulSmash", "Hikaru"]) {
      await request(createApp(db, fakeRegistry({}, name)))
        .post("/api/profiles")
        .send({ username: name });
    }

    const res = await request(createApp(db, fakeRegistry({}))).get("/api/profiles");

    expect(res.status).toBe(200);
    expect(
      res.body.map((p: { platform: string; username: string }) => [p.platform, p.username]),
    ).toEqual([
      ["chesscom", "DudulSmash"],
      ["chesscom", "Hikaru"],
    ]);
  });

  it("GET /api/profiles counts each Profile's own Games — imported and analyzed", async () => {
    const { db } = openDb(":memory:");
    const mine = seedProfile(db, "DudulSmash");
    const theirs = seedProfile(db, "Hikaru");
    db.insert(games)
      .values([
        { ...morphyGame(mine), gameUrl: "https://chess.com/g/1", analyzed: true },
        { ...morphyGame(mine), gameUrl: "https://chess.com/g/2" },
        { ...morphyGame(theirs), gameUrl: "https://chess.com/g/3" },
      ])
      .run();

    const res = await request(createApp(db, fakeRegistry({}))).get("/api/profiles");

    expect(res.body).toMatchObject([
      { username: "DudulSmash", games: 2, analyzed: 1 },
      { username: "Hikaru", games: 1, analyzed: 0 },
    ]);
  });

  it("GET /api/profiles/:id answers that one Profile with its counters, and 404 for an unknown id", async () => {
    const { db } = openDb(":memory:");
    const mine = seedProfile(db, "DudulSmash");
    const theirs = seedProfile(db, "Hikaru");
    db.insert(games)
      .values([
        { ...morphyGame(mine), gameUrl: "https://chess.com/g/1", analyzed: true },
        { ...morphyGame(theirs), gameUrl: "https://chess.com/g/2" },
      ])
      .run();
    const app = createApp(db, fakeRegistry({}));

    const res = await request(app).get(`/api/profiles/${mine}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: mine,
      platform: "chesscom",
      username: "DudulSmash",
      games: 1,
      analyzed: 1,
    });
    expect((await request(app).get(`/api/profiles/${theirs}`)).body).toMatchObject({
      games: 1,
      analyzed: 0,
    });
    expect((await request(app).get("/api/profiles/9999")).status).toBe(404);
  });

  it("DELETE /api/profiles/:id removes it, and answers 404 for one that never existed", async () => {
    const app = appAnswering("DudulSmash");
    const created = await request(app).post("/api/profiles").send({ username: "dudulsmash" });

    expect((await request(app).delete(`/api/profiles/${created.body.id}`)).status).toBe(204);
    expect((await request(app).get("/api/profiles")).body).toEqual([]);
    expect((await request(app).delete("/api/profiles/9999")).status).toBe(404);
  });
});

/**
 * The partitioning property of ADR-0014, stated the way the PRD asks for it:
 * *data created under Profile A is absent from every answer given about Profile
 * B* — endpoint by endpoint, at the HTTP seam, never by inspecting a query.
 */
describe("profile scoping", () => {
  let seq = 0;

  /** A Game under `profileId`, with whatever distinguishes it from its neighbours. */
  function scopedGame(profileId: number, over: Partial<import("../src/db/schema").NewGame> = {}) {
    return {
      profileId,
      gameUrl: `https://www.chess.com/game/live/scoped-${seq++}`,
      pgn: "1. e4 e5",
      opponent: "opp",
      playerColor: "white" as const,
      result: "win" as const,
      date: "2026-01-01",
      timeControlCategory: "blitz" as const,
      eco: "C20",
      openingName: "King's Pawn Game",
      ...over,
    };
  }

  /** Two Profiles with clearly different histories: one Game for A, two for B. */
  function twoProfiles() {
    const { db } = openDb(":memory:");
    const a = seedProfile(db, "Alice");
    const b = seedProfile(db, "Bob");
    db.insert(games)
      .values([
        scopedGame(a, { opponent: "alice-opponent", result: "win" }),
        scopedGame(b, { opponent: "bob-opponent", result: "loss" }),
        scopedGame(b, { opponent: "bob-opponent", result: "loss" }),
      ])
      .run();
    return { db, a, b, app: createApp(db, fakeRegistry({})) };
  }

  it("GET /api/games answers about the named Profile alone", async () => {
    const { app, a, b } = twoProfiles();

    const mine = await request(app).get(`/api/games?profileId=${a}`);
    const theirs = await request(app).get(`/api/games?profileId=${b}`);

    expect(mine.status).toBe(200);
    expect(mine.body.map((g: { opponent: string }) => g.opponent)).toEqual(["alice-opponent"]);
    expect(theirs.body).toHaveLength(2);
  });

  it("GET /api/games naming no Profile, or an unknown one, is refused — never answered over all rows", async () => {
    const { app } = twoProfiles();

    const unscoped = await request(app).get("/api/games");
    const unknown = await request(app).get("/api/games?profileId=9999");

    expect(unscoped.status).toBe(400);
    expect(unscoped.body.error).toMatch(/profil/i);
    expect(unknown.status).toBe(404);
    // The point of the refusal: neither answer carries a Game.
    expect(unscoped.body.length).toBeUndefined();
    expect(unknown.body.length).toBeUndefined();
  });

  it("GET /api/stats counts the named Profile's Games only — one Win rate per player", async () => {
    const { app, a, b } = twoProfiles();

    const mine = await request(app).get(`/api/stats?profileId=${a}`);
    const theirs = await request(app).get(`/api/stats?profileId=${b}`);

    // Alice won her only Game, Bob lost both: a blend would read 1 win / 2
    // losses over three Games for either of them.
    expect(mine.body.total).toMatchObject({ games: 1, win: 1, loss: 0, winRate: 1 });
    expect(theirs.body.total).toMatchObject({ games: 2, win: 0, loss: 2, winRate: 0 });
    expect((await request(app).get("/api/stats")).status).toBe(400);
    expect((await request(app).get("/api/stats?profileId=9999")).status).toBe(404);
  });

  it("GET /api/openings computes a repertoire from the named Profile's Games alone", async () => {
    const { db, app, a, b } = twoProfiles();
    // Both players reach the same `Opening` as White in blitz: merged, it would
    // be one entry over three Games, and neither player's repertoire.
    db.insert(games)
      .values(scopedGame(b, { eco: "C20", result: "loss" }))
      .run();

    const mine = await request(app).get(`/api/openings?profileId=${a}`);
    const theirs = await request(app).get(`/api/openings?profileId=${b}`);

    expect(mine.body.openings).toEqual([
      expect.objectContaining({ eco: "C20", games: 1, win: 1, winRate: 1 }),
    ]);
    expect(theirs.body.openings).toEqual([
      expect.objectContaining({ eco: "C20", games: 3, loss: 3, winRate: 0 }),
    ]);
    expect((await request(app).get("/api/openings")).status).toBe(400);
    expect((await request(app).get("/api/openings?profileId=9999")).status).toBe(404);
  });

  it("GET /api/danger derives the recurring Positions of the named Profile alone", async () => {
    const { db } = openDb(":memory:");
    const a = seedProfile(db, "Alice");
    const b = seedProfile(db, "Bob");
    // Alice reaches the same Position in two analyzed Games — a `Danger
    // position` for her. Bob reaches it once: for him nothing recurs. Blended,
    // Bob's page would show a recurring Position he never played twice.
    const inserted = db
      .insert(games)
      .values([
        scopedGame(a, { pgn: "1. e4", analyzed: true }),
        scopedGame(a, { pgn: "1. e4", analyzed: true }),
        scopedGame(b, { pgn: "1. e4", analyzed: true }),
      ])
      .returning()
      .all();
    db.insert(evaluations)
      .values(
        inserted.flatMap((g) =>
          gamePositions("1. e4").map((fen, ply) => ({
            gameId: g.id,
            ply,
            fen,
            cp: 0,
            pv: fixtureBestLine(fen).join(" "),
          })),
        ),
      )
      .run();
    const app = createApp(db, fakeRegistry({}));

    const mine = await request(app).get(`/api/danger?profileId=${a}`);
    const theirs = await request(app).get(`/api/danger?profileId=${b}`);

    expect(mine.body).toEqual({
      dangers: [{ fen: AFTER_E4, reached: 2, seriousErrors: 0, proportion: 0 }],
      analyzedGames: 2,
    });
    expect(theirs.body).toEqual({ dangers: [], analyzedGames: 1 });
    expect((await request(app).get("/api/danger")).status).toBe(400);
    expect((await request(app).get("/api/danger?profileId=9999")).status).toBe(404);
  });

  it("GET /api/move-habits aggregates the named Profile's counters — two repertoires never merge into one line", async () => {
    const { db } = openDb(":memory:");
    const a = seedProfile(db, "Alice");
    const b = seedProfile(db, "Bob");
    // Both open 1. e4; Alice once, Bob twice. One line for the pair would read
    // "3 parties" and belong to neither of them.
    for (const [owner, times] of [
      [a, 1],
      [b, 2],
    ] as const) {
      for (let i = 0; i < times; i++) {
        recordMoveHabits(db, db.insert(games).values(scopedGame(owner)).returning().get());
      }
    }
    const app = createApp(db, fakeRegistry({}));

    const ask = (profileId: number | string) =>
      request(app).get("/api/move-habits").query({ profileId, side: "white", fen: START });

    const mine = (await ask(a)).body.candidates.find((c: { san: string }) => c.san === "e4");
    const theirs = (await ask(b)).body.candidates.find((c: { san: string }) => c.san === "e4");

    expect(mine).toMatchObject({ count: 1 });
    expect(theirs).toMatchObject({ count: 2 });
    expect(
      (await request(app).get("/api/move-habits").query({ side: "white", fen: START })).status,
    ).toBe(400);
    expect((await ask(9999)).status).toBe(404);
  });
});
