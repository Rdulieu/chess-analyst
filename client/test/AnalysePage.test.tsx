import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AnalysePage } from "../src/pages/AnalysePage";
import { OPERA_GAME } from "./fixtures";

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

afterEach(() => vi.unstubAllGlobals());

function renderAt(gameId: number) {
  return render(
    <MemoryRouter initialEntries={[`/analyse/${gameId}`]}>
      <Routes>
        <Route path="/analyse/:gameId" element={<AnalysePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AnalysePage — the screen announces itself", () => {
  it("is one region named 'Analyse', with a level-2 heading, and asks for the wide column", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/games/1") return json({ ...OPERA_GAME, analyzed: false });
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    renderAt(1);

    const region = await screen.findByRole("region", { name: /^analyse$/i });
    expect(screen.getByRole("heading", { level: 2, name: /^analyse$/i })).toBeTruthy();
    // A dense screen: it is allowed more width than the reading column.
    expect(region.dataset.width).toBe("wide");
  });
});

describe("AnalysePage", () => {
  it("refreshes the Game and its annotations once the 'Analyser' action completes, with no manual reload", async () => {
    let analyzed = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url === "/api/games/1") return json({ ...OPERA_GAME, analyzed });
        if (url === "/api/analyze" && opts?.method === "POST") {
          return json({ running: true, total: 1, done: 0 }, 202);
        }
        if (url === "/api/analyze/status") {
          analyzed = true; // the pass finishes on the first poll
          return json({ running: false, total: 1, done: 1 });
        }
        if (url === "/api/games/1/annotations") {
          return json({
            analyzed: true,
            plies: [
              { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null },
              { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder" },
            ],
          });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const user = userEvent.setup();
    renderAt(1);

    await user.click(await screen.findByRole("button", { name: /analyser cette partie/i }));

    // The board's move list (with the annotation flag) appears with no reload or user action beyond the click.
    // A generous timeout: the pass genuinely waits out runAnalysis' real polling interval.
    // Asked for by its accessible name rather than by the glyph's text: since
    // US-14 the same glyph is also drawn on the `Evaluation curve`, and the move
    // list is the accessible source of the two.
    expect(await screen.findByLabelText("blunder", undefined, { timeout: 3000 })).toBeTruthy();
  });
});
