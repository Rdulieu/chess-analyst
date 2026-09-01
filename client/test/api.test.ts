import { afterEach, describe, it, expect, vi } from "vitest";
import {
  fetchDangerView,
  fetchGame,
  fetchGames,
  fetchWeakOpenings,
  fetchGameAnnotations,
  fetchMoveHabits,
  fetchStats,
  startImport,
  getSettings,
  saveSettings,
} from "../src/api";
import { OPERA_GAME } from "./fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startImport", () => {
  it("POSTs the Import's month range to /api/import and returns the initial status", async () => {
    const fetchMock = vi.fn<(url: string | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        ({
          ok: true,
          status: 202,
          json: async () => ({ running: true, total: 3, done: 0, result: null }),
        }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    const params = {
      profileId: 7,
      from: { year: 2024, month: 1 },
      to: { year: 2024, month: 3 },
      categories: ["blitz", "rapid"] as const,
    };
    const status = await startImport({ ...params, categories: [...params.categories] });

    // 202 means "under way", not "done" — the summary arrives through polling.
    expect(status).toEqual({ running: true, total: 3, done: 0, result: null });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/import");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      profileId: 7,
      from: { year: 2024, month: 1 },
      to: { year: 2024, month: 3 },
      categories: ["blitz", "rapid"],
    });
  });

  it("throws with the server error message when the Import cannot be started", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: false,
            status: 404,
            json: async () => ({ error: "Profil introuvable : 9999" }),
          }) as Response,
      ),
    );

    await expect(
      startImport({
        profileId: 9999,
        from: { year: 2024, month: 1 },
        to: { year: 2024, month: 1 },
        categories: ["blitz"],
      }),
    ).rejects.toThrow(/introuvable/);
  });
});

describe("settings", () => {
  it("getSettings reads the stored username from /api/settings", async () => {
    const fetchMock = vi.fn(
      async () => ({ ok: true, status: 200, json: async () => ({ username: "magnus" }) }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    const settings = await getSettings();

    expect(fetchMock).toHaveBeenCalledWith("/api/settings");
    expect(settings.username).toBe("magnus");
  });

  it("saveSettings PUTs the username to /api/settings", async () => {
    const fetchMock = vi.fn<(url: string | URL, init?: RequestInit) => Promise<Response>>(
      async () => ({ ok: true, status: 200, json: async () => ({ username: "magnus" }) }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    await saveSettings("magnus");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/settings");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(init?.body as string)).toEqual({ username: "magnus" });
  });
});

describe("fetchGame", () => {
  it("requests /api/games/:id and returns that Game", async () => {
    const fetchMock = vi.fn(
      async () => ({ ok: true, status: 200, json: async () => OPERA_GAME }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    const game = await fetchGame(OPERA_GAME.id, 7);

    // The Profile travels with the request: the server refuses to answer a
    // question that names nobody, and rightly (ADR-0014).
    expect(fetchMock).toHaveBeenCalledWith(`/api/games/${OPERA_GAME.id}?profileId=7`);
    expect(game).toEqual(OPERA_GAME);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }) as Response),
    );

    await expect(fetchGame(999, 7)).rejects.toThrow(/999/);
  });
});

describe("fetchGameAnnotations", () => {
  it("requests /api/games/:id/annotations and returns the response", async () => {
    const body = { analyzed: true, plies: [{ ply: 0, whiteEval: { cp: 25, mate: null }, whiteWinChances: 55, severity: null }] };
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => body }) as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGameAnnotations(42, 7);

    expect(fetchMock).toHaveBeenCalledWith("/api/games/42/annotations?profileId=7");
    expect(result).toEqual(body);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }) as Response),
    );

    await expect(fetchGameAnnotations(999, 7)).rejects.toThrow(/999/);
  });
});

describe("fetchMoveHabits", () => {
  it("requests /api/move-habits with the fen and side and returns the candidates", async () => {
    const candidates = [
      {
        san: "e4",
        count: 3,
        win: 1,
        draw: 1,
        loss: 1,
        winRate: 0.5,
        byCategory: { bullet: 0, blitz: 2, rapid: 1, classical: 0, correspondence: 0 },
      },
    ];
    const fetchMock = vi.fn<(url: string | URL) => Promise<Response>>(
      async () => ({ ok: true, status: 200, json: async () => ({ candidates }) }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchMoveHabits(7, "START_FEN", "white");

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain("/api/move-habits");
    expect(url).toContain("side=white");
    expect(url).toContain("fen=START_FEN");
    expect(result).toEqual(candidates);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response),
    );

    await expect(fetchMoveHabits(7, "FEN", "black")).rejects.toThrow();
  });
});

describe("fetchStats", () => {
  it("requests /api/stats and returns the summary", async () => {
    const summary = {
      total: { games: 2, win: 1, draw: 0, loss: 1, winRate: 0.5 },
      byCategory: {
        bullet: { games: 0, win: 0, draw: 0, loss: 0, winRate: null },
        blitz: { games: 2, win: 1, draw: 0, loss: 1, winRate: 0.5 },
        rapid: { games: 0, win: 0, draw: 0, loss: 0, winRate: null },
        daily: { games: 0, win: 0, draw: 0, loss: 0, winRate: null },
      },
      bySide: {
        white: { games: 2, win: 1, draw: 0, loss: 1, winRate: 0.5 },
        black: { games: 0, win: 0, draw: 0, loss: 0, winRate: null },
      },
    };
    const fetchMock = vi.fn(
      async () => ({ ok: true, status: 200, json: async () => summary }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchStats(7);

    expect(fetchMock).toHaveBeenCalledWith("/api/stats?profileId=7");
    expect(result).toEqual(summary);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response),
    );

    await expect(fetchStats(7)).rejects.toThrow();
  });
});

/**
 * Client-side, the scoping is carried the same way it is server-side: the
 * caller names the `Profile` (ADR-0014). A read that forgot to name one cannot
 * come back with somebody else's figures — it comes back refused.
 */
describe("the scoped reads name their Profile", () => {
  const ok = (body: unknown) =>
    vi.fn<(url: string | URL) => Promise<Response>>(
      async () => ({ ok: true, status: 200, json: async () => body }) as Response,
    );

  it("puts the Profile in the query of every scoped read", async () => {
    const cases: [string, (mock: ReturnType<typeof ok>) => Promise<unknown>][] = [
      ["/api/games", async () => fetchGames(7)],
      ["/api/stats", async () => fetchStats(7)],
      ["/api/openings", async () => fetchWeakOpenings(7)],
      ["/api/danger", async () => fetchDangerView(7)],
      ["/api/move-habits", async () => fetchMoveHabits(7, "FEN", "white")],
    ];

    for (const [path, call] of cases) {
      const fetchMock = ok({ openings: [], dangers: [], analyzedGames: 0, candidates: [] });
      vi.stubGlobal("fetch", fetchMock);

      await call(fetchMock);

      const url = String(fetchMock.mock.calls[0][0]);
      expect(url).toContain(path);
      expect(url).toContain("profileId=7");
    }
  });
});
