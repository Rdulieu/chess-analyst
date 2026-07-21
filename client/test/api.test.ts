import { afterEach, describe, it, expect, vi } from "vitest";
import { fetchGame, importGames, getSettings, saveSettings } from "../src/api";
import { OPERA_GAME } from "./fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("importGames", () => {
  it("POSTs the import scope to /api/import and returns the result", async () => {
    const fetchMock = vi.fn<(url: string | URL, init?: RequestInit) => Promise<Response>>(
      async () =>
        ({ ok: true, status: 200, json: async () => ({ imported: 3, alreadyPresent: 1 }) }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await importGames({
      username: "me",
      year: 2024,
      month: 1,
      categories: ["blitz", "rapid"],
    });

    expect(result).toEqual({ imported: 3, alreadyPresent: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/import");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      username: "me",
      year: 2024,
      month: 1,
      categories: ["blitz", "rapid"],
    });
  });

  it("throws with the server error message when the import fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          ({
            ok: false,
            status: 404,
            json: async () => ({ error: "Unknown chess.com username: ghost" }),
          }) as Response,
      ),
    );

    await expect(
      importGames({ username: "ghost", year: 2024, month: 1, categories: ["blitz"] }),
    ).rejects.toThrow(/ghost/);
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
