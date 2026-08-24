import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ReadingPage } from "../src/pages/ReadingPage";
import { CurrentProfileProvider } from "../src/features/profiles/CurrentProfileContext";
import { OPERA_GAME } from "./fixtures";

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

/**
 * The reading route with `current` selected as the Player's Profile, over a Game
 * owned by `owner`. The server is faked as the real one behaves: it answers a
 * reading only when the request's Profile is the Game's own (ADR-0014).
 */
function renderReading({ current, owner }: { current: number; owner: number }) {
  localStorage.setItem("chess-analyst.current-profile", String(current));
  const asked: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      asked.push(url);
      if (url === "/api/games/1") return json({ ...OPERA_GAME, profileId: owner });
      if (url.startsWith(`/api/profiles/${current}`))
        return json({ id: current, platform: "chesscom", username: "Someone", games: 0 });
      if (url.startsWith("/api/personal/1")) {
        const asked = Number(new URL(url, "http://x").searchParams.get("profileId"));
        return asked === owner
          ? json({ gameId: 1, sealedAt: null, engineSeenBeforeSeal: null, marks: [] })
          : json({ error: "Partie introuvable pour ce profil : 1" }, 404);
      }
      throw new Error(`unexpected fetch: ${url}`);
    }),
  );
  render(
    <CurrentProfileProvider>
      <MemoryRouter initialEntries={["/analyse/1/lecture"]}>
        <Routes>
          <Route path="/analyse/:gameId/lecture" element={<ReadingPage />} />
        </Routes>
      </MemoryRouter>
    </CurrentProfileProvider>,
  );
  return asked;
}

describe("the reading route belongs to the current Profile", () => {
  it("asks for the reading under the CURRENT Profile, never under the Game's owner", async () => {
    const asked = renderReading({ current: 1, owner: 1 });

    await waitFor(() => expect(asked.some((u) => u.startsWith("/api/personal/1"))).toBe(true));
    expect(asked.find((u) => u.startsWith("/api/personal/1"))).toContain("profileId=1");
  });

  it("does NOT show one Profile's reading while another Profile is selected", async () => {
    renderReading({ current: 4, owner: 1 });

    // The reading of a Game that is not this Profile's is not this Profile's to
    // read. Said in words, and the board is not drawn at all.
    await screen.findByText(/n'appartient pas au profil courant/i);
    expect(screen.queryByRole("list", { name: "moves" })).toBeNull();
  });

  it("sends the Player to choose a Profile rather than reading under nobody's name", async () => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(async () => json({}, 500)));

    render(
      <CurrentProfileProvider>
        <MemoryRouter initialEntries={["/analyse/1/lecture"]}>
          <Routes>
            <Route path="/analyse/:gameId/lecture" element={<ReadingPage />} />
            <Route path="/profiles" element={<p>Choisir un profil</p>} />
          </Routes>
        </MemoryRouter>
      </CurrentProfileProvider>,
    );

    await screen.findByText("Choisir un profil");
  });
});
