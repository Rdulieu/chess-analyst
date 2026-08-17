import { afterEach, describe, it, expect, vi } from "vitest";
import {
  fetchGame,
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

    const game = await fetchGame(OPERA_GAME.id);

    expect(fetchMock).toHaveBeenCalledWith(`/api/games/${OPERA_GAME.id}`);
    expect(game).toEqual(OPERA_GAME);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }) as Response),
    );

    await expect(fetchGame(999)).rejects.toThrow(/999/);
  });
});

describe("fetchGameAnnotations", () => {
  it("requests /api/games/:id/annotations and returns the response", async () => {
    const body = { analyzed: true, plies: [{ ply: 0, whiteEval: { cp: 25, mate: null }, whiteWinChances: 55, severity: null }] };
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => body }) as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGameAnnotations(42);

    expect(fetchMock).toHaveBeenCalledWith("/api/games/42/annotations");
    expect(result).toEqual(body);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }) as Response),
    );

    await expect(fetchGameAnnotations(999)).rejects.toThrow(/999/);
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
        byCategory: { bullet: 0, blitz: 2, rapid: 1, daily: 0 },
      },
    ];
    const fetchMock = vi.fn<(url: string | URL) => Promise<Response>>(
      async () => ({ ok: true, status: 200, json: async () => ({ candidates }) }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchMoveHabits("START_FEN", "white");

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

    await expect(fetchMoveHabits("FEN", "black")).rejects.toThrow();
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

    const result = await fetchStats();

    expect(fetchMock).toHaveBeenCalledWith("/api/stats");
    expect(result).toEqual(summary);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response),
    );

    await expect(fetchStats()).rejects.toThrow();
  });
});
