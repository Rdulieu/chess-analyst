import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CurrentProfileProvider } from "../src/features/profiles/CurrentProfileContext";
import { AnalysePage } from "../src/pages/AnalysePage";
import { OPERA_GAME } from "./fixtures";

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function renderAt(gameId: number) {
  // The page is Profile-scoped (ADR-0014): it needs a selected Profile to be
  // about anybody at all.
  localStorage.setItem("chess-analyst.current-profile", "1");
  return render(
    <CurrentProfileProvider>
      <MemoryRouter initialEntries={[`/analyse/${gameId}`]}>
      <Routes>
        <Route path="/analyse/:gameId" element={<AnalysePage />} />
      </Routes>
      </MemoryRouter>
    </CurrentProfileProvider>,
  );
}

describe("AnalysePage — the screen announces itself", () => {
  it("is one region named 'Analyse', with a level-2 heading, and asks for the wide column", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/profiles/1"))
          return json({ id: 1, platform: "chesscom", username: "DudulSmash", games: 1 });
        if (url.startsWith("/api/games/1") && !url.includes("/annotations")) return json({ ...OPERA_GAME, analyzed: false });
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
        if (url.startsWith("/api/profiles/1"))
          return json({ id: 1, platform: "chesscom", username: "DudulSmash", games: 1 });
        if (url.startsWith("/api/games/1") && !url.includes("/annotations")) return json({ ...OPERA_GAME, analyzed });
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          return json({ running: true, total: 1, done: 0 }, 202);
        }
        if (url.startsWith("/api/analyze/status")) {
          analyzed = true; // the pass finishes on the first poll
          return json({ running: false, total: 1, done: 1 });
        }
        if (url.startsWith("/api/games/1/annotations")) {
          return json({
            analyzed: true,
            plies: [
              { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
              { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: [], phase: "early", counted: null, chancesLost: null },
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

describe("AnalysePage — the way into the Confrontation", () => {
  function withReading(reading: "none" | "open" | "sealed") {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/profiles/1"))
          return json({ id: 1, platform: "chesscom", username: "DudulSmash", games: 1 });
        if (url.startsWith("/api/games/1") && !url.includes("/annotations")) return json({ ...OPERA_GAME, analyzed: true, reading });
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    return renderAt(1);
  }

  it("offers the confrontation once the reading is sealed — sealing has to lead somewhere", async () => {
    withReading("sealed");

    const link = await screen.findByRole("link", { name: /face au moteur|confronter/i });
    expect(link.getAttribute("href")).toBe("/analyse/1/confrontation");
  });

  it("does not offer it while the reading is unsealed or absent", async () => {
    withReading("open");
    await screen.findByRole("region", { name: /^analyse$/i });
    expect(screen.queryByRole("link", { name: /face au moteur|confronter/i })).toBeNull();

    vi.unstubAllGlobals();
    withReading("none");
    await screen.findAllByRole("region", { name: /^analyse$/i });
    expect(screen.queryByRole("link", { name: /face au moteur|confronter/i })).toBeNull();
  });
});

describe("AnalysePage — the two acts read as acts (US-23, D2)", () => {
  function withReading(reading: "none" | "open" | "sealed") {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/profiles/1"))
          return json({ id: 1, platform: "chesscom", username: "DudulSmash", games: 1 });
        if (url.startsWith("/api/games/1") && !url.includes("/annotations"))
          return json({ ...OPERA_GAME, analyzed: true, reading });
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    return renderAt(1);
  }

  /*
   * The rule was already in the stylesheet and applied to ONE element of the whole
   * app: a link carrying `data-action` is an act the Player takes and must read as
   * one — while staying an anchor, so middle-click, "open in a new tab" and the
   * status bar keep working. These tests pin the marker and the element type; the
   * appearance is the sheet's business and no colour is pinned here.
   */
  it("marks the way into the personal reading, and keeps it an anchor", async () => {
    withReading("none");

    const entry = await screen.findByRole("link", { name: /écrire ma lecture/i });
    expect(entry.hasAttribute("data-action")).toBe(true);
    expect(entry.tagName).toBe("A");
    expect(entry.getAttribute("href")).toBe("/analyse/1/lecture");
  });

  it("marks it whichever of the three invitations it is showing", async () => {
    // Three states, three names, one act: the marker cannot depend on the wording.
    withReading("open");
    const resume = await screen.findByRole("link", { name: /reprendre ma lecture/i });
    expect(resume.hasAttribute("data-action")).toBe(true);
  });

  it("marks the way into the Confrontation, and keeps it an anchor", async () => {
    withReading("sealed");

    const entry = await screen.findByRole("link", { name: /confronter/i });
    expect(entry.hasAttribute("data-action")).toBe(true);
    expect(entry.tagName).toBe("A");
  });
});
