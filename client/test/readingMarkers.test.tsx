import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GameList } from "../src/features/games/GameList";
import { AnalysePage } from "../src/pages/AnalysePage";
import { Routes, Route } from "react-router-dom";
import { CurrentProfileProvider } from "../src/features/profiles/CurrentProfileContext";
import { OPERA_GAME } from "./fixtures";

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("the Games list says which Games carry a reading", () => {
  it("names each state in words, in its own column", () => {
    render(
      <GameList
        games={[
          { ...OPERA_GAME, id: 1, opponent: "sans", reading: "none" },
          { ...OPERA_GAME, id: 2, opponent: "en cours", reading: "open" },
          { ...OPERA_GAME, id: 3, opponent: "scellée", reading: "sealed" },
        ]}
        onSelect={() => {}}
        selectedIds={new Set()}
        onToggleSelect={() => {}}
      />,
    );

    const table = screen.getByRole("table", { name: "parties" });
    // A column of its own, like the analysed state already has — so the Player
    // sweeps it to choose the next Game to work on.
    expect(within(table).getByRole("columnheader", { name: /lecture/i })).not.toBeNull();
    const rows = within(table).getAllByRole("row").slice(1);
    // In words, never a tint alone (ADR-0013).
    expect(rows[1].textContent).toMatch(/en cours/i);
    expect(rows[2].textContent).toMatch(/scellée/i);
  });
});

describe("the Analyse page says where the reading stands", () => {
  function renderAnalyse(reading: string) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/profiles/1"))
          return json({ id: 1, platform: "chesscom", username: "DudulSmash", games: 1 });
        if (url.startsWith("/api/games/1") && !url.includes("/annotations"))
          return json({ ...OPERA_GAME, id: 1, analyzed: false, reading });
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    // The page is Profile-scoped (ADR-0014): it needs a selected Profile to be
    // about anybody at all.
    localStorage.setItem("chess-analyst.current-profile", "1");
    return render(
      <CurrentProfileProvider>
        <MemoryRouter initialEntries={["/analyse/1"]}>
          <Routes>
            <Route path="/analyse/:gameId" element={<AnalysePage />} />
          </Routes>
        </MemoryRouter>
      </CurrentProfileProvider>,
    );
  }

  it("invites the Player to begin one when there is none", async () => {
    renderAnalyse("none");

    await screen.findByRole("link", { name: /écrire ma lecture/i });
    expect(screen.getByText(/aucune lecture/i)).not.toBeNull();
  });

  it("tells a reading in progress from a sealed one, so the Player knows where to resume", async () => {
    renderAnalyse("open");
    await screen.findByText(/lecture en cours/i);
    // The way in names what it is: resuming, not starting.
    expect(screen.getByRole("link", { name: /reprendre ma lecture/i })).not.toBeNull();
  });

  it("says a sealed reading is sealed", async () => {
    renderAnalyse("sealed");

    // By its own element, not by the words: "sealed" is deliberately said twice
    // here — in the state and in the invitation — so matching the phrase alone
    // would find both.
    const link = await screen.findByRole("link", { name: /voir ma lecture/i });
    expect(link.parentElement?.querySelector('[data-reading="sealed"]')?.textContent).toMatch(
      /lecture scellée/i,
    );
  });
});
