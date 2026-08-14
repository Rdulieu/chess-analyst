import { describe, it, expect } from "vitest";
import request from "supertest";
import { openDb } from "../src/db";
import { gamePositions } from "../src/chess/positions";
import { games, evaluations } from "../src/db/schema";
import { createApp } from "../src/app";
import { createFixtureEngine } from "../src/engine/fixture";
import { recordMoveHabits } from "../src/move-habits/precompute";
import { MORPHY_GAME, chessComGame, fakeClient } from "./fixtures";
import type { ChessComClient } from "../src/chesscom";

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

function appWithGame() {
  const { db } = openDb(":memory:");
  db.insert(games).values(MORPHY_GAME).run();
  return createApp(db, fakeClient({}));
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
    const app = createApp(db, fakeClient({}));

    const res = await request(app).get("/api/games");

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
    const list = await request(app).get("/api/games");
    const id = list.body[0].id as number;

    const res = await request(app).get(`/api/games/${id}/annotations`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ analyzed: false, plies: [] });
  });

  it("GET /api/games/:id/annotations returns the per-ply annotations for an analyzed Game", async () => {
    const { db } = openDb(":memory:");
    const game = db
      .insert(games)
      .values({
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
        gamePositions(game.pgn).map((fen, ply) => ({ gameId: game.id, ply, fen, cp: 0, mate: null })),
      )
      .run();
    const app = createApp(db, fakeClient({}));

    const res = await request(app).get(`/api/games/${game.id}/annotations`);

    expect(res.status).toBe(200);
    expect(res.body.analyzed).toBe(true);
    expect(res.body.plies).toHaveLength(3);
    expect(res.body.plies[0]).toMatchObject({ ply: 0, severity: null });
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
    return { app: createApp(db, fakeClient({}), createFixtureEngine()), db };
  }

  const appWithGames = (pgns: string[]) => appAndStore(pgns).app;

  /** Polls the status endpoint until the pass reports it is no longer running. */
  async function waitDone(app: ReturnType<typeof appWithGames>) {
    for (let i = 0; i < 50; i++) {
      const res = await request(app).get("/api/analyze/status");
      if (!res.body.running) return res.body;
      await new Promise((r) => setTimeout(r, 5));
    }
    throw new Error("analysis did not finish in time");
  }

  const idsOf = async (app: ReturnType<typeof appWithGames>) =>
    (await request(app).get("/api/games")).body.map((g: { id: number }) => g.id);

  it("POST /api/analyze starts a background pass (202) and /status advances in Positions, reporting how many Games it covers", async () => {
    const app = appWithGames(["1. e4 e5", "1. d4 d5"]); // 2 Games, 3 Positions each

    const started = await request(app).post("/api/analyze").send({ gameIds: await idsOf(app) });
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
    await request(app).post("/api/analyze").send({ gameIds: ids });
    const finished = await waitDone(app);

    const again = await request(app).post("/api/analyze").send({ gameIds: ids });
    expect(again.status).toBe(202);
    // An empty pass is not a pass: the previous one is reported, untouched.
    expect(again.body).toEqual({ ...finished, started: false });
  });

  it("POST /api/analyze/acknowledge marks the last pass as seen, and is harmless twice", async () => {
    const app = appWithGames(["1. e4 e5"]);
    await request(app).post("/api/analyze").send({ gameIds: await idsOf(app) });
    expect(await waitDone(app)).toMatchObject({ acknowledged: false });

    expect((await request(app).post("/api/analyze/acknowledge")).status).toBe(204);
    expect((await request(app).get("/api/analyze/status")).body).toMatchObject({
      acknowledged: true,
      done: 3,
      games: 1,
    });

    expect((await request(app).post("/api/analyze/acknowledge")).status).toBe(204);
    expect((await request(app).get("/api/analyze/status")).body).toMatchObject({
      acknowledged: true,
    });
  });

  it("POST /api/analyze says whether it actually started a pass, so 'nothing to do' is not guesswork", async () => {
    const app = appWithGames(["1. e4 e5"]);
    const ids = await idsOf(app);

    expect((await request(app).post("/api/analyze").send({ gameIds: ids })).body).toMatchObject({
      started: true,
    });
    await waitDone(app);

    expect((await request(app).post("/api/analyze").send({ gameIds: ids })).body).toMatchObject({
      started: false,
    });
  });

  it("GET /api/analyze/status reports the last pass to a freshly built app (it outlives the process)", async () => {
    const { app, db } = appAndStore(["1. e4 e5"]);
    await request(app).post("/api/analyze").send({ gameIds: await idsOf(app) });
    await waitDone(app);

    // A second app over the same store — as after a restart.
    const restarted = createApp(db, fakeClient({}), createFixtureEngine());
    expect((await request(restarted).get("/api/analyze/status")).body).toEqual({
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
    const before = await request(app).get("/api/games");
    expect(before.body[0].analyzed).toBe(false);

    await request(app).post("/api/analyze").send({ gameIds: [before.body[0].id] });
    await waitDone(app);

    const after = await request(app).get("/api/games");
    expect(after.body[0].analyzed).toBe(true);
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
    const app = createApp(db, fakeClient({}));

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
    const app = createApp(db, fakeClient({}));

    const res = await request(app).get("/api/openings");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ openings: [] });
  });
});

describe("danger API", () => {
  it("GET /api/danger returns the recurring Danger position entries", async () => {
    const { db } = openDb(":memory:");
    db.insert(games)
      .values(
        [1, 2].map((n) => ({
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
          gamePositions("1. e4").map((fen, ply) => ({ gameId, ply, fen, cp: 0 })),
        ),
      )
      .run();
    const app = createApp(db, fakeClient({}));

    const res = await request(app).get("/api/danger");

    expect(res.status).toBe(200);
    expect(res.body.dangers).toEqual([
      { fen: AFTER_E4, reached: 2, seriousErrors: 0, proportion: 0 },
    ]);
  });

  it("GET /api/danger states how many Games are analyzed, so an empty list can be read", async () => {
    const { db } = openDb(":memory:");
    db.insert(games)
      .values(
        [1, 2].map((n) => ({
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
      .values(gamePositions("1. e4").map((fen, ply) => ({ gameId: 1, ply, fen, cp: 0 })))
      .run();
    const app = createApp(db, fakeClient({}));

    const res = await request(app).get("/api/danger");

    // One analyzed Game reaches no Position twice, so the list is empty while
    // an analysis has taken place — a different state from "nothing analyzed".
    expect(res.body).toEqual({ dangers: [], analyzedGames: 1 });
  });

  it("GET /api/danger returns no entry and no analyzed Game for an empty history", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient({}));

    const res = await request(app).get("/api/danger");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ dangers: [], analyzedGames: 0 });
  });
});

describe("import API", () => {
  it("POST /api/import accepts a month range, runs it in the background, and the Games then show up in GET /api/games", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient({
      "2024-01": [chessComGame({ url: "https://www.chess.com/game/live/1" })],
      "2024-03": [chessComGame({ url: "https://www.chess.com/game/live/2" })],
    });
    const app = createApp(db, client);

    const res = await request(app)
      .post("/api/import")
      .send({
        username: "me",
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

    const list = await request(app).get("/api/games");
    expect(list.body).toHaveLength(2);
    expect(list.body[0]).toMatchObject({ playerColor: "white", result: "win" });
  });

  it("GET /api/import/status carries a line per month, a failed month included, without aborting", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(
      db,
      fakeClient({
        "2024-01": [chessComGame()],
        "2024-02": new Error("chess.com request failed (429)"),
        "2024-03": [chessComGame()],
      }),
    );

    await request(app)
      .post("/api/import")
      .send({
        username: "me",
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

    const list = await request(app).get("/api/games");
    expect(list.body).toHaveLength(2);
  });

  it("POST /api/import rejects an inverted range with 400 and starts nothing", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient({ "2024-01": [chessComGame()] }));

    const res = await request(app)
      .post("/api/import")
      .send({
        username: "me",
        from: { year: 2024, month: 6 },
        to: { year: 2024, month: 3 },
        categories: ["blitz"],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/range|plage|month/i);

    const status = await request(app).get("/api/import/status");
    expect(status.body.running).toBe(false);
    expect((await request(app).get("/api/games")).body).toEqual([]);
  });

  it("POST /api/import covers no month at all when the range lies entirely in the future", async () => {
    const { db } = openDb(":memory:");
    let monthsFetched = 0;
    const app = createApp(db, {
      playerExists: async () => true,
      fetchMonth: async () => {
        monthsFetched++;
        return [];
      },
    });
    const nextYear = new Date().getFullYear() + 1;

    await request(app)
      .post("/api/import")
      .send({
        username: "me",
        from: { year: nextYear, month: 1 },
        to: { year: nextYear, month: 6 },
        categories: ["blitz"],
      });

    const final = await importDone(app);
    // No phantom months reported at zero — the range simply covers nothing.
    expect(monthsFetched).toBe(0);
    expect(final.result.months).toEqual([]);
    expect(final.result.message).toMatch(/no games found/i);
  });

  it("POST /api/import checks the username once, before any month is fetched", async () => {
    const { db } = openDb(":memory:");
    let monthsFetched = 0;
    let existsChecks = 0;
    const client: ChessComClient = {
      playerExists: async () => {
        existsChecks++;
        return false;
      },
      fetchMonth: async () => {
        monthsFetched++;
        return [];
      },
    };
    const app = createApp(db, client);

    const res = await request(app)
      .post("/api/import")
      .send({
        username: "ghost",
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 12 },
        categories: ["blitz"],
      });

    expect(res.status).toBe(404);
    expect(existsChecks).toBe(1); // once for the range, not once per month
    expect(monthsFetched).toBe(0);
  });

  it("POST /api/import imposes no cap on how long a range may be", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient({}));

    // Rebuilding a whole history in one Import is a supported use (ADR-0010).
    const res = await request(app)
      .post("/api/import")
      .send({
        username: "me",
        from: { year: 2010, month: 1 },
        to: { year: 2025, month: 12 },
        categories: ["blitz"],
      });

    expect(res.status).toBe(202);
    expect(res.body.total).toBe(192);
    await importDone(app);
  });

  it("POST /api/import returns an error and starts nothing for an unknown username", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient({ "2024-01": [chessComGame()] }, false));

    const res = await request(app)
      .post("/api/import")
      .send({
        username: "ghost",
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 1 },
        categories: ["blitz"],
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/username/i);

    // No job was started, so nothing was imported and the status is idle.
    const status = await request(app).get("/api/import/status");
    expect(status.body.running).toBe(false);
    const list = await request(app).get("/api/games");
    expect(list.body).toEqual([]);
  });

  it("stays responsive when the chess.com request fails", async () => {
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
      .send({
        username: "me",
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 1 },
        categories: ["blitz"],
      });

    expect(res.status).toBe(202);
    const final = await importDone(app);
    expect(final.running).toBe(false);

    // The relay must not have crashed: a later request still works.
    const list = await request(app).get("/api/games");
    expect(list.status).toBe(200);
  });

  it("POST /api/import reports zero with a message covering the whole range", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient({}));

    await request(app)
      .post("/api/import")
      .send({
        username: "me",
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 3 },
        categories: ["blitz"],
      });

    const final = await importDone(app);
    expect(final.result).toMatchObject({ imported: 0, alreadyPresent: 0 });
    expect(final.result.message).toMatch(/no games found/i);
  });
});

describe("settings API", () => {
  it("GET /api/settings then PUT then GET round-trips the Player's username", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient({}));

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
    const app = createApp(db, fakeClient({}));

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
    const app = createApp(db, fakeClient({}));

    const res = await request(app).get("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.total).toMatchObject({ games: 2, win: 1, loss: 1, winRate: 0.5 });
    expect(res.body.byCategory.blitz).toMatchObject({ games: 1, win: 1 });
    expect(res.body.byCategory.rapid).toMatchObject({ games: 0, winRate: null });
    expect(res.body.bySide.black).toMatchObject({ games: 1, loss: 1 });
  });

  it("GET /api/stats returns zeros with a null rate on an empty history", async () => {
    const { db } = openDb(":memory:");
    const app = createApp(db, fakeClient({}));

    const res = await request(app).get("/api/stats");

    expect(res.status).toBe(200);
    expect(res.body.total).toEqual({ games: 0, win: 0, draw: 0, loss: 0, winRate: null });
  });
});
