import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AnalysePage } from "../src/pages/AnalysePage";
import { CurrentProfileProvider } from "../src/features/profiles/CurrentProfileContext";
import { OPERA_GAME } from "./fixtures";

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

/**
 * The analyse route with `current` selected, over a Game owned by `owner`. The
 * server is faked as the real one now behaves: it answers a Game only to the
 * Profile that Game belongs to (ADR-0014), and refuses a request that names no
 * Profile at all.
 */
function renderAnalyse({ current, owner }: { current: number; owner: number }) {
  localStorage.setItem("chess-analyst.current-profile", String(current));
  const asked: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      asked.push(url);
      if (url.startsWith(`/api/profiles/${current}`))
        return json({ id: current, platform: "chesscom", username: "Someone", games: 0 });
      if (url.startsWith("/api/games/1")) {
        const named = new URL(url, "http://x").searchParams.get("profileId");
        if (named === null) return json({ error: "Aucun profil indiqué" }, 400);
        return Number(named) === owner
          ? json({ ...OPERA_GAME, profileId: owner, analyzed: false })
          : json({ error: "Partie introuvable pour ce profil : 1" }, 404);
      }
      if (url.startsWith("/api/analyze/status")) return json({ running: false, total: 0, done: 0 });
      throw new Error(`unexpected fetch: ${url}`);
    }),
  );
  render(
    <CurrentProfileProvider>
      <MemoryRouter initialEntries={["/analyse/1"]}>
        <Routes>
          <Route path="/analyse/:gameId" element={<AnalysePage />} />
        </Routes>
      </MemoryRouter>
    </CurrentProfileProvider>,
  );
  return asked;
}

describe("the analyse route belongs to the current Profile", () => {
  it("names the current Profile when it asks for the Game", async () => {
    const asked = renderAnalyse({ current: 1, owner: 1 });

    await waitFor(() => expect(asked.some((u) => u.startsWith("/api/games/1"))).toBe(true));
    expect(asked.find((u) => u.startsWith("/api/games/1"))).toContain("profileId=1");
    // The Game IS this Profile's, so the screen draws it.
    await screen.findByRole("heading", { level: 2, name: /^analyse$/i });
  });

  it("refuses a Game that is not the current Profile's, and says so", async () => {
    // The hole F-02 named: this screen used to draw one Player's Game while
    // another Profile was selected, with nothing on it saying so — and the
    // reading route next door already refused the very same Game.
    renderAnalyse({ current: 4, owner: 1 });

    await screen.findByText(/n'appartient pas au profil courant/i);
    expect(screen.queryByRole("list", { name: "moves" })).toBeNull();
  });
});
