import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConfrontationPage } from "../src/pages/ConfrontationPage";
import { CurrentProfileProvider } from "../src/features/profiles/CurrentProfileContext";
import type { GameConfrontation } from "../src/types";

const CONFRONTATION: GameConfrontation = {
  gameId: 1,
  sealedAt: "2026-08-25T10:00:00.000Z",
  provenance: "unaided",
  regime: { depth: 16, lines: 2 },
  severity: {
    countedMoves: 20,
    examined: 10,
    scorable: 10,
    agreed: 7,
    matrix: {
      blunder: { blunder: 2, mistake: 3, inaccuracy: 0, none: 0 },
      mistake: { blunder: 0, mistake: 1, inaccuracy: 0, none: 0 },
      inaccuracy: { blunder: 0, mistake: 0, inaccuracy: 1, none: 0 },
      sound: { blunder: 0, mistake: 0, inaccuracy: 0, none: 3 },
      good: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
    },
    unscored: { good: 0, opponent: 0 },
  },
  keyMoments: { marked: 0, damageFound: 0, damageTotal: 0, drift: 0, misses: [] },
  uncounted: [],
  posterior: [],
};

/**
 * The confrontation route talks to two endpoints and no more. Anything else
 * throws loudly: this screen derives everything from records the app already
 * serves, and a silent extra fetch would mean a second derivation of the method.
 */
function stub(answer: { status: number; body: unknown }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/profiles"))
        return { ok: true, status: 200, json: async () => [{ id: 3, handle: "Me", platform: "chess.com" }] } as Response;
      if (url.startsWith("/api/games/1"))
        return { ok: true, status: 200, json: async () => ({ id: 1, opponent: "opp", playerColor: "white" }) } as Response;
      if (url.includes("/confrontation"))
        return { ok: answer.status === 200, status: answer.status, json: async () => answer.body } as Response;
      throw new Error(`unexpected request: ${url}`);
    }),
  );
}

function renderPage() {
  localStorage.setItem("chess-analyst.current-profile", "3");
  return render(
    <CurrentProfileProvider>
      <MemoryRouter initialEntries={["/analyse/1/confrontation"]}>
        <Routes>
          <Route path="/analyse/:gameId/confrontation" element={<ConfrontationPage />} />
        </Routes>
      </MemoryRouter>
    </CurrentProfileProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("Confrontation page", () => {
  it("shows the two figures and the provenance of the reading behind them", async () => {
    stub({ status: 200, body: CONFRONTATION });
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("group", { name: /ce que j'ai examiné/i })).not.toBeNull(),
    );
    expect(screen.getByRole("group", { name: /ce que j'ai vu juste/i })).not.toBeNull();
    // A comparison with no provenance is not a comparison.
    expect(screen.getByText(/à l'aveugle/i)).not.toBeNull();
    // Under what depth the engine's side was produced: without it the figures
    // would be an artefact of a search regime nobody stated.
    expect(screen.getByText(/profondeur 16/i)).not.toBeNull();
  });

  it("tells the Player to seal when the reading is not sealed", async () => {
    stub({
      status: 409,
      body: { reason: "not-sealed", error: "Cette lecture n'est pas encore scellée." },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText(/pas encore scellée/i)).not.toBeNull());
    // And the way to go and do it, not just the refusal.
    expect(screen.getByRole("link", { name: /lecture/i })).not.toBeNull();
    expect(screen.queryByRole("group", { name: /ce que j'ai examiné/i })).toBeNull();
  });

  it("tells the Player to analyse when the Game has never been through the engine", async () => {
    stub({
      status: 409,
      body: { reason: "not-analyzed", error: "Cette partie n'a pas été analysée." },
    });
    renderPage();

    await waitFor(() => expect(screen.getByText(/n'a pas été analysée/i)).not.toBeNull());
    expect(screen.getByRole("link", { name: /analyse/i })).not.toBeNull();
  });

  it("keeps the two refusals apart — they send the Player to two different places", async () => {
    stub({ status: 409, body: { reason: "not-sealed", error: "Pas scellée." } });
    const first = renderPage();
    await waitFor(() => expect(screen.getByText(/pas scellée/i)).not.toBeNull());
    const sealHref = screen.getByRole("link", { name: /lecture/i }).getAttribute("href");
    first.unmount();

    stub({ status: 409, body: { reason: "not-analyzed", error: "Pas analysée." } });
    renderPage();
    await waitFor(() => expect(screen.getByText(/pas analysée/i)).not.toBeNull());
    const analyseHref = screen.getByRole("link", { name: /analyse/i }).getAttribute("href");

    expect(sealHref).not.toBe(analyseHref);
  });
});
