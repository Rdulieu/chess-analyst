import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder" },
    ]);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    const items = await screen.findAllByRole("listitem");
    expect(items[0].textContent).toContain("??");
    expect(items[0].textContent).toContain("-4.0");
  });

  it("hides every glyph and Evaluation once the toggle is switched off", async () => {
    stubAnnotations([
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder" },
    ]);
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await screen.findByText(/-4\.0/);

    await user.click(screen.getByRole("checkbox", { name: /afficher les annotations/i }));

    const items = screen.getAllByRole("listitem");
    expect(items[0].textContent).not.toContain("??");
    expect(items[0].textContent).not.toContain("-4.0");
  });

  it("does not fetch annotations, and shows no toggle, for a not-yet-analyzed Game", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    expect(fetchMock).not.toHaveBeenCalled();
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
        if (url === "/api/analyze" && opts?.method === "POST") {
          expect(JSON.parse(opts.body as string)).toEqual({ gameIds: [OPERA_GAME.id] });
          return { ok: true, status: 202, json: async () => ({ running: true, total: 3, done: 0, games: 1 }) } as Response;
        }
        if (url === "/api/analyze/status") {
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
        if (url === "/api/analyze" && opts?.method === "POST") {
          return { ok: true, status: 202, json: async () => ({ running: true, total: 3, done: 0, games: 1 }) } as Response;
        }
        if (url === "/api/analyze/status") {
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
