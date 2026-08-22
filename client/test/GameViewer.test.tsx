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

afterEach(() => {
  vi.unstubAllGlobals();
  // The Review mode is remembered across Games *and* sessions, so it is also
  // remembered across tests unless each one starts from a blank slate.
  localStorage.clear();
});

describe("GameViewer", () => {
  /** "1. e4 e5" annotated so that e4 is a Blunder with a line to report. */
  const ANNOTATED = [
    { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: ["d2d4"], phase: "early", counted: null, chancesLost: null },
    { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: ["e7e5"], phase: "early", counted: null, chancesLost: null },
  ] satisfies MoveAnnotation[];

  const moveItems = () =>
    within(screen.getByRole("list", { name: "moves" })).getAllByRole("listitem");

  it("opens an analysed Game in Unaided: the Game is readable and the engine says nothing", async () => {
    stubAnnotations(ANNOTATED);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    // The move list is there — it is not an annotation — and the level control is
    // there to ask with. What the engine found is not.
    await screen.findByRole("radiogroup", { name: /niveau de revue/i });
    const items = moveItems();
    expect(items[0].textContent).not.toContain("??");
    expect(items[0].textContent).not.toContain("-4.0");
    expect(screen.queryByRole("region", { name: /relevé/i })).toBeNull();
  });

  it("offers ONE control with three exclusive levels, never two independent switches", async () => {
    stubAnnotations(ANNOTATED);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    const group = await screen.findByRole("radiogroup", { name: /niveau de revue/i });
    const levels = within(group).getAllByRole("radio");
    expect(levels).toHaveLength(3);
    expect(levels.filter((level) => (level as HTMLInputElement).checked)).toHaveLength(1);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("reveals the annotations at the intermediate level, and the record only at the detailed one", async () => {
    stubAnnotations(ANNOTATED);
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    await user.click(await screen.findByRole("radio", { name: /annoté/i }));

    expect(moveItems()[0].textContent).toContain("??");
    expect(moveItems()[0].textContent).toContain("-4.0");
    // Annotated is exactly what US-7/US-14 delivered: the record is the next level up.
    expect(screen.queryByRole("region", { name: /relevé/i })).toBeNull();

    await user.click(screen.getByRole("radio", { name: /détaillé/i }));

    expect(moveItems()[0].textContent).toContain("??");
    expect(screen.getByRole("region", { name: /relevé/i })).toBeTruthy();
  });

  it("remembers the level, so the next Game opens at it without being asked again", async () => {
    stubAnnotations(ANNOTATED);
    const user = userEvent.setup();
    const { unmount } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    await user.click(await screen.findByRole("radio", { name: /détaillé/i }));
    unmount();
    // Another Game — a remount is what navigating to one does.
    render(<GameViewer game={{ ...OPERA_GAME, id: 99, analyzed: true }} />);

    expect((await screen.findByRole("radio", { name: /détaillé/i })) as HTMLInputElement).toHaveProperty(
      "checked",
      true,
    );
    expect(screen.getByRole("region", { name: /relevé/i })).toBeTruthy();
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

  it("does not fetch annotations, and offers no level control, for a not-yet-analyzed Game", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    // The annotations endpoint specifically — the page does ask for the last
    // pass on mount, so that an unacknowledged summary reappears (US-8 02).
    expect(fetchMock.mock.calls.map(([url]) => url as string)).not.toContain(
      `/api/games/${OPERA_GAME.id}/annotations`,
    );
    // Nothing to reveal on an unanalysed Game, so the control offers nothing.
    expect(screen.queryByRole("radiogroup", { name: /niveau de revue/i })).toBeNull();
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

  it("moves THIS review to Annotated when a pass finishes on it, without changing the remembered level", async () => {
    let analyzed = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          return { ok: true, status: 202, json: async () => ({ running: true, total: 2, done: 0, games: 1 }) } as Response;
        }
        if (url.startsWith("/api/analyze/status")) {
          analyzed = true;
          return { ok: true, status: 200, json: async () => ({ running: false, total: 2, done: 2, games: 1 }) } as Response;
        }
        if (url.endsWith("/annotations")) {
          return { ok: true, status: 200, json: async () => ({ analyzed: true, plies: ANNOTATED }) } as Response;
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const user = userEvent.setup();
    // The parent re-renders the Game as analysed once the pass reports done —
    // which is what an unanalysed Game becoming reviewable looks like.
    const { rerender } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    await user.click(screen.getByRole("button", { name: /analyser cette partie/i }));
    await waitFor(() => expect(analyzed).toBe(true));
    rerender(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    // A finished pass that changed nothing on screen is indistinguishable from
    // one that did nothing: this review shows what was just computed.
    await waitFor(() =>
      expect(
        within(screen.getByRole("list", { name: "moves" })).getAllByRole("listitem")[0].textContent,
      ).toContain("??"),
    );
    // ...but the Player never asked for that on their *other* Games.
    expect(localStorage.getItem("chess-analyst.review-mode")).toBeNull();
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
