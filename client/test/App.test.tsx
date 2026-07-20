import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { App } from "../src/App";
import { OPERA_GAME } from "./fixtures";

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe("App", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (url: string | URL): Promise<Response> => {
      if (url.toString() === "/api/games") return jsonResponse([OPERA_GAME]);
      return { ok: false, status: 404, json: async () => ({}) } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads the Game from the API and renders its board and details", async () => {
    const { container } = render(<App />);

    // The board is wired from the fetched Game (position correctness is covered
    // in Board.test); here we prove App fetched a Game and rendered the board.
    await waitFor(() => {
      expect(container.querySelectorAll("[data-piece]")).toHaveLength(32);
    });
    expect(screen.getByText(/Duke Karl/)).toBeTruthy();
  });

  it("fetches only the list endpoint — no redundant per-game request", async () => {
    render(<App />);
    await screen.findByText(/Duke Karl/);

    expect(fetchMock).toHaveBeenCalledWith("/api/games");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
