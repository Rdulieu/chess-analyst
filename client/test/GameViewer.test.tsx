import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameViewer } from "../src/features/games/GameViewer";
import { OPERA_GAME } from "./fixtures";
import type { MoveAnnotation } from "../src/types";

function stubAnnotations(plies: MoveAnnotation[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ analyzed: true, plies }) }) as Response),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("GameViewer", () => {
  it("fetches and shows annotations for an analyzed Game", async () => {
    stubAnnotations([
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [] },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: [] },
    ]);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    // Scoped to the move list rather than to the page, so a list item added elsewhere
    // in the viewer cannot make this assertion drift.
    const moves = await screen.findByRole("list", { name: "moves" });
    const items = within(moves).getAllByRole("listitem");
    expect(items[0].textContent).toContain("??");
    expect(items[0].textContent).toContain("-4.0");
  });

  it("hides every glyph and Evaluation once the toggle is switched off", async () => {
    stubAnnotations([
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [] },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: [] },
    ]);
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await screen.findByText(/-4\.0/);

    await user.click(screen.getByRole("checkbox", { name: /afficher les annotations/i }));

    // Scoped to the move list: an unscoped negative assertion would pass vacuously
    // on any other list item the viewer renders.
    const items = within(screen.getByRole("list", { name: "moves" })).getAllByRole("listitem");
    expect(items[0].textContent).not.toContain("??");
    expect(items[0].textContent).not.toContain("-4.0");
  });

  it("keeps a single live region of ours: the pass progress, not the move readout", () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("no fetch expected"); }));

    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    // Stepping through moves answers the Player's own click and is already on
    // screen; announcing it competes for speech with a pass that runs for
    // minutes. It keeps its name and its text, it just stops being live.
    // react-chessboard emits its own unlabelled live region for drag-and-drop —
    // third-party, not ours to remove — so we assert on the ones we own.
    const ours = [...container.querySelectorAll('[role="status"]')].filter((el) =>
      el.hasAttribute("aria-label"),
    );
    expect(ours).toHaveLength(0); // no pass running here, and the move readout is no longer live
    expect(screen.getByLabelText("current move").textContent).toBe("Start");
  });

  it("does not fetch annotations, and shows no toggle, for a not-yet-analyzed Game", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    // The annotations endpoint specifically — the page does ask for the last
    // pass on mount, so that an unacknowledged summary reappears (US-8 02).
    expect(fetchMock.mock.calls.map(([url]) => url as string)).not.toContain(
      `/api/games/${OPERA_GAME.id}/annotations`,
    );
    expect(screen.queryByRole("checkbox", { name: /afficher les annotations/i })).toBeNull();
  });

  it("shows an explicit invitation and a per-Game 'Analyser' action for a not-yet-analyzed Game, alongside the board", () => {
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    expect(screen.getByText(/n'a pas encore été analysée/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /analyser cette partie/i })).toBeTruthy();
    // The board is never withheld: a Game is explorable as soon as it is imported.
    expect(screen.getByRole("list", { name: "moves" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
  });

  it("keeps the board free of annotations until the Game has been analyzed", () => {
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    expect(screen.getByLabelText("current move").textContent).toBe("Start");
    expect(screen.queryByLabelText("evaluation")).toBeNull();
  });

  it("scopes 'Analyser cette partie' to only this Game and shows progress while the pass runs", async () => {
    // Two polls before completion, so the in-progress render isn't immediately
    // overwritten by completion in the same tick.
    let statusPolls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          expect(JSON.parse(opts.body as string)).toEqual({ gameIds: [OPERA_GAME.id] });
          return { ok: true, status: 202, json: async () => ({ running: true, total: 3, done: 0, games: 1 }) } as Response;
        }
        if (url.startsWith("/api/analyze/status")) {
          statusPolls += 1;
          const running = statusPolls < 2;
          return { ok: true, status: 200, json: async () => ({ running, total: 3, done: running ? 0 : 3, games: 1 }) } as Response;
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    await user.click(screen.getByRole("button", { name: /analyser cette partie/i }));

    expect((await screen.findByRole("status", { name: /progression de l'analyse/i })).textContent).toBe(
      "0/3 positions évaluées",
    );
  });

  it("notifies once the analysis pass completes, so the Game and its annotations can refresh", async () => {
    const onAnalyzed = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          return { ok: true, status: 202, json: async () => ({ running: true, total: 3, done: 0, games: 1 }) } as Response;
        }
        if (url.startsWith("/api/analyze/status")) {
          return { ok: true, status: 200, json: async () => ({ running: false, total: 3, done: 3, games: 1 }) } as Response;
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} onAnalyzed={onAnalyzed} />);

    await user.click(screen.getByRole("button", { name: /analyser cette partie/i }));

    await waitFor(() => expect(onAnalyzed).toHaveBeenCalledTimes(1));
  });
});

describe("GameViewer — game header", () => {
  function squareOrder(container: HTMLElement): string[] {
    return [...container.querySelectorAll("[data-square]")].map(
      (el) => el.getAttribute("data-square")!,
    );
  }

  it("names both players with their colour", () => {
    render(<GameViewer game={OPERA_GAME} />);

    const header = screen.getByRole("region", { name: /partie/i });
    expect(header.textContent).toContain("Paul Morphy");
    expect(header.textContent).toContain("Duke Karl / Count Isouard");
    expect(header.textContent).toMatch(/blancs/i);
    expect(header.textContent).toMatch(/noirs/i);
  });

  it("marks which of the two is the Player, in words and not by colour alone", () => {
    render(<GameViewer game={{ ...OPERA_GAME, playerColor: "black" }} />);

    const player = screen.getByRole("region", { name: /partie/i }).querySelector("[data-player]");
    expect(player?.textContent).toContain("Duke Karl / Count Isouard");
    expect(player?.textContent).toMatch(/vous/i);
  });

  it("states the result from the Player's side rather than as a symmetric score", () => {
    const { rerender } = render(<GameViewer game={{ ...OPERA_GAME, result: "win" }} />);
    expect(screen.getByRole("region", { name: /partie/i }).textContent).toMatch(/victoire/i);

    rerender(<GameViewer game={{ ...OPERA_GAME, result: "loss" }} />);
    expect(screen.getByRole("region", { name: /partie/i }).textContent).toMatch(/défaite/i);

    rerender(<GameViewer game={{ ...OPERA_GAME, result: "draw" }} />);
    expect(screen.getByRole("region", { name: /partie/i }).textContent).toMatch(/nulle/i);
  });

  it("shows the date, the time control category and the Opening", () => {
    render(
      <GameViewer
        game={{
          ...OPERA_GAME,
          date: "2026-06-04",
          timeControlCategory: "blitz",
          eco: "B22",
          openingName: "Sicilian Defense: Alapin Variation",
        }}
      />,
    );

    const header = screen.getByRole("region", { name: /partie/i }).textContent!;
    expect(header).toContain("2026-06-04");
    expect(header).toMatch(/blitz/i);
    expect(header).toContain("B22");
    expect(header).toContain("Sicilian Defense: Alapin Variation");
  });

  it("says an unclassified Game has no Opening rather than leaving it blank", () => {
    render(<GameViewer game={{ ...OPERA_GAME, eco: null, openingName: null }} />);

    expect(screen.getByRole("region", { name: /partie/i }).textContent).toMatch(/non classée/i);
  });

  it("orients the board to the side the Player played", () => {
    const { container, rerender } = render(
      <GameViewer game={{ ...OPERA_GAME, playerColor: "white" }} />,
    );
    expect(squareOrder(container)[0]).toBe("a8");

    rerender(<GameViewer game={{ ...OPERA_GAME, playerColor: "black" }} />);
    expect(squareOrder(container)[0]).toBe("h1");
  });

  it("shows the header for a Game that has not been analyzed yet", () => {
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    expect(screen.getByRole("region", { name: /partie/i }).textContent).toContain("Paul Morphy");
  });

  it("leaves the header untouched while stepping through the Moves", async () => {
    const user = userEvent.setup();
    render(<GameViewer game={OPERA_GAME} />);

    const before = screen.getByRole("region", { name: /partie/i }).textContent;
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByRole("region", { name: /partie/i }).textContent).toBe(before);
  });
});
