import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, it, expect, vi } from "vitest";
import { GamesPage } from "../src/pages/GamesPage";
import type { Game } from "../src/types";

const GAME: Game = {
  id: 42,
  gameUrl: "https://chess.com/g/42",
  pgn: "1. e4 e5",
  opponent: "opp",
  playerColor: "white",
  result: "win",
  date: "2026-01-01",
  timeControlCategory: "blitz",
  analyzed: false,
};

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

afterEach(() => vi.unstubAllGlobals());

describe("GamesPage — analysis pass", () => {
  it("selects a Game, runs the analysis with a progress readout, and shows 'analysée' when done", async () => {
    let analyzed = false; // flips once the pass completes; drives the badge
    let statusPolls = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url === "/api/games") return json([{ ...GAME, analyzed }]);
        if (url === "/api/analyze" && opts?.method === "POST") {
          return json({ running: true, total: 1, done: 0 }, 202);
        }
        if (url === "/api/analyze/status") {
          statusPolls += 1;
          analyzed = true; // the pass finishes on the first poll
          return json({ running: false, total: 1, done: 1 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByLabelText(/sélectionner la partie vs opp/i));
    await userEvent.click(screen.getByRole("button", { name: /analyser la sélection/i }));

    // The list refreshes once the pass completes and the Game flips to analyzed,
    // and the global count follows along with it.
    expect(await screen.findByLabelText(/analysée/i)).toBeTruthy();
    expect(await screen.findByText(/1 partie · 1 analysée/i)).toBeTruthy();
    expect(statusPolls).toBeGreaterThan(0);
  });

  it("reads the progress in Positions evaluated, not in Games", async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url === "/api/games") return json([{ ...GAME }]);
        if (url === "/api/analyze" && opts?.method === "POST") {
          return json({ running: true, total: 4, done: 1, games: 1 }, 202);
        }
        if (url === "/api/analyze/status") {
          await held; // hold the pass open so the running readout can be observed
          return json({ running: false, total: 4, done: 4, games: 1 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByLabelText(/sélectionner la partie vs opp/i));
    await userEvent.click(screen.getByRole("button", { name: /analyser la sélection/i }));

    expect(await screen.findByText(/1\/4 positions évaluées/i)).toBeTruthy();
    release();
  });

  it("still shows the final count once the pass is over, instead of discarding it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url === "/api/games") return json([{ ...GAME }]);
        if (url === "/api/analyze" && opts?.method === "POST") {
          return json({ running: true, total: 4, done: 0, games: 1, acknowledged: false, started: true }, 202);
        }
        if (url === "/api/analyze/status") {
          return json({ running: false, total: 4, done: 4, games: 1 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByLabelText(/sélectionner la partie vs opp/i));
    await userEvent.click(screen.getByRole("button", { name: /analyser la sélection/i }));

    // The Player must be left with the completed figure, not an empty page.
    expect(await screen.findByText(/1 partie · 4 positions évaluées/i)).toBeTruthy();
  });

  it("sums up the finished pass in Games and Positions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url === "/api/games") return json([{ ...GAME }]);
        if (url === "/api/analyze" && opts?.method === "POST") {
          return json(
            { running: true, total: 312, done: 0, games: 3, acknowledged: false, started: true },
            202,
          );
        }
        if (url === "/api/analyze/status") {
          return json({ running: false, total: 312, done: 312, games: 3, acknowledged: false });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByLabelText(/sélectionner la partie vs opp/i));
    await userEvent.click(screen.getByRole("button", { name: /analyser la sélection/i }));

    expect(await screen.findByText(/3 parties · 312 positions évaluées/i)).toBeTruthy();
  });

  it("shows a finished, unacknowledged pass on arrival and lets the Player dismiss it", async () => {
    let acknowledged = false;
    const status = () => ({ running: false, total: 312, done: 312, games: 3, acknowledged });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url === "/api/games") return json([{ ...GAME, analyzed: true }]);
        if (url === "/api/analyze/status") return json(status());
        if (url === "/api/analyze/acknowledge" && opts?.method === "POST") {
          acknowledged = true;
          return json(null, 204);
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    );

    // Nobody started a pass in this page's lifetime: it is the persisted one.
    const summary = await screen.findByText(/3 parties · 312 positions évaluées/i);
    expect(summary).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /fermer/i }));

    expect(screen.queryByText(/312 positions évaluées/i)).toBeNull();
    expect(acknowledged).toBe(true);
  });

  it("says there was nothing to analyze, rather than looking like a failed pass", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url === "/api/games") return json([{ ...GAME, analyzed: true }]);
        if (url === "/api/analyze" && opts?.method === "POST") {
          // Everything selected is already analyzed: no pass was opened.
          return json(
            { running: false, total: 6, done: 6, games: 1, acknowledged: true, started: false },
            202,
          );
        }
        if (url === "/api/analyze/status")
          return json({ running: false, total: 6, done: 6, games: 1, acknowledged: true });
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByLabelText(/sélectionner la partie vs opp/i));
    await userEvent.click(screen.getByRole("button", { name: /analyser la sélection/i }));

    expect(await screen.findByText(/rien à analyser/i)).toBeTruthy();
  });

  it("does not show an already-acknowledged pass on arrival", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/games") return json([{ ...GAME, analyzed: true }]);
        if (url === "/api/analyze/status")
          return json({ running: false, total: 6, done: 6, games: 1, acknowledged: true });
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/analysée/i)).toBeTruthy(); // the page did load
    expect(screen.queryByText(/positions évaluées/i)).toBeNull();
  });

  it("states how much of the history is analyzed, on arrival", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/games")
          return json([
            { ...GAME, id: 1, opponent: "a", analyzed: true },
            { ...GAME, id: 2, opponent: "b", analyzed: false },
            { ...GAME, id: 3, opponent: "c", analyzed: false },
          ]);
        if (url === "/api/analyze/status")
          return json({
            running: false,
            total: 0,
            done: 0,
            games: 0,
            acknowledged: false,
            outcome: null,
            error: null,
          });
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/3 parties · 1 analysée/i)).toBeTruthy();
  });

  it("shows no count at all on an empty history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/games") return json([]);
        if (url === "/api/analyze/status")
          return json({
            running: false,
            total: 0,
            done: 0,
            games: 0,
            acknowledged: false,
            outcome: null,
            error: null,
          });
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no games yet/i)).toBeTruthy();
    expect(screen.queryByText(/analysée/i)).toBeNull();
  });

  it("disables 'Analyser la sélection' until at least one Game is selected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/games") return json([{ ...GAME }]);
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage />
      </MemoryRouter>,
    );

    const button = (await screen.findByRole("button", {
      name: /analyser la sélection/i,
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await userEvent.click(await screen.findByLabelText(/sélectionner la partie vs opp/i));
    expect(button.disabled).toBe(false);
  });
});
