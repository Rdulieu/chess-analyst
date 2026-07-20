import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { App } from "../src/App";
import { OPERA_GAME } from "./fixtures";

// react-chessboard renders each piece as an element with id
// `chessboard-piece-<type>-<square>` carrying `data-piece="<type>"`.
function pieceAt(container: HTMLElement, square: string): string | null {
  const el = Array.from(container.querySelectorAll<HTMLElement>("[data-piece]")).find((e) =>
    e.id.endsWith(`-${square}`),
  );
  return el?.getAttribute("data-piece") ?? null;
}

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

function mockApi() {
  return vi.fn(async (url: string | URL): Promise<Response> => {
    const path = url.toString();
    if (path === "/api/games") return jsonResponse([OPERA_GAME]);
    if (path === `/api/games/${OPERA_GAME.id}`) return jsonResponse(OPERA_GAME);
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
}

describe("App", () => {
  let fetchMock: ReturnType<typeof mockApi>;

  beforeEach(() => {
    fetchMock = mockApi();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the fetched Game's starting position on the board", async () => {
    const { container } = render(<App />);

    await waitFor(() => {
      expect(container.querySelectorAll("[data-piece]")).toHaveLength(32);
    });

    // Standard chess starting position, derived from the Game's PGN.
    expect(pieceAt(container, "e2")).toBe("wP");
    expect(pieceAt(container, "a1")).toBe("wR");
    expect(pieceAt(container, "e1")).toBe("wK");
    expect(pieceAt(container, "d8")).toBe("bQ");
    expect(pieceAt(container, "e8")).toBe("bK");
    expect(pieceAt(container, "e4")).toBeNull();
  });

  it("loads the Game from the API rather than hardcoding it, and shows its details", async () => {
    render(<App />);

    expect(await screen.findByText(/Duke Karl/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith("/api/games");
    expect(fetchMock).toHaveBeenCalledWith(`/api/games/${OPERA_GAME.id}`);
  });
});
