import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, it, expect, vi } from "vitest";
import { GamesPage } from "../src/pages/GamesPage";
import type { Game } from "../src/types";

const GAME: Game = {
  id: 42,
  profileId: 7,
  gameUrl: "https://chess.com/g/42",
  pgn: "1. e4 e5",
  opponent: "opp",
  playerColor: "white",
  result: "win",
  date: "2026-01-01",
  timeControlCategory: "blitz",
  eco: null,
  openingName: null,
  analyzed: false,
};

/** The current `Profile` these screens are about — every scoped page takes one. */
const PROFILE = {
  id: 7,
  platform: "chesscom" as const,
  username: "Alice",
  createdAt: "",
  games: 1,
  analyzed: 0,
};

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

afterEach(() => vi.unstubAllGlobals());

describe("GamesPage — the screen announces itself", () => {
  it("is one region named 'Mes parties', carrying a level-2 heading", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/games")) return json([]);
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
      </MemoryRouter>,
    );

    const screenRegion = await screen.findByRole("region", { name: /mes parties/i });
    expect(within(screenRegion).getByRole("heading", { level: 2, name: /mes parties/i })).toBeTruthy();
  });

  it("asks for the wide column, because six columns do not fit the reading measure", async () => {
    // Same diagnosis as `/openings`, which carries the same attribute for the same
    // reason: inside the 72ch reading column the Game table needs 788px for 659px
    // of room, so its last column — `État`, and with it the "analysée" badge — sits
    // off-screen at every viewport. The container scrolls rather than the page
    // (that part is settled), but a column nothing hints at is a column nobody
    // reads. The FP of the games-table slice measured it.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/games")) return json([GAME]);
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
      </MemoryRouter>,
    );

    const screenRegion = await screen.findByRole("region", { name: /mes parties/i });
    expect(screenRegion.getAttribute("data-width")).toBe("wide");
  });

  it("shows the Game list alone — the import form moved onto the Profile's page", async () => {
    // Importing is an operation ON a Profile (US-11): the form left the busiest
    // screen in the app for the page of the Profile it imports under.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/games")) return json([]);
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
      </MemoryRouter>,
    );

    await screen.findByRole("region", { name: /mes parties/i });
    expect(screen.queryByRole("form", { name: /import/i })).toBeNull();
  });
});

describe("GamesPage — analysis pass", () => {
  it("starts the pass — and polls it — under the Profile the page is about", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/games")) return json([GAME]);
        if (url.startsWith("/api/analyze")) {
          urls.push(url);
          return json({ running: false, total: 1, done: 1, games: 1 }, opts?.method ? 202 : 200);
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByLabelText(/sélectionner la partie vs opp/i));
    await userEvent.click(screen.getByRole("button", { name: /analyser la sélection/i }));

    // Engine time goes where the screen says it goes (ADR-0014): every leg of
    // the pass names this Profile, the arrival poll included.
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => url.includes(`profileId=${PROFILE.id}`))).toBe(true);
  });


  it("selects a Game, runs the analysis with a progress readout, and shows 'analysée' when done", async () => {
    let analyzed = false; // flips once the pass completes; drives the badge
    let statusPolls = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/games")) return json([{ ...GAME, analyzed }]);
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          return json({ running: true, total: 1, done: 0 }, 202);
        }
        if (url.startsWith("/api/analyze/status")) {
          statusPolls += 1;
          analyzed = true; // the pass finishes on the first poll
          return json({ running: false, total: 1, done: 1 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByLabelText(/sélectionner la partie vs opp/i));
    await userEvent.click(screen.getByRole("button", { name: /analyser la sélection/i }));

    // The list refreshes once the pass completes and the Game flips to analyzed,
    // and the global count follows along with it.
    expect(await screen.findByLabelText(/analysée/i)).toBeTruthy();
    expect(await screen.findByText(/historique : 1 partie analysée sur 1/i)).toBeTruthy();
    expect(statusPolls).toBeGreaterThan(0);
  });

  it("reads the progress in Positions evaluated, not in Games", async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/games")) return json([{ ...GAME }]);
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          return json({ running: true, total: 4, done: 1, games: 1 }, 202);
        }
        if (url.startsWith("/api/analyze/status")) {
          await held; // hold the pass open so the running readout can be observed
          return json({ running: false, total: 4, done: 4, games: 1 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
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
        if (url.startsWith("/api/games")) return json([{ ...GAME }]);
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          return json({ running: true, total: 4, done: 0, games: 1, acknowledged: false, started: true }, 202);
        }
        if (url.startsWith("/api/analyze/status")) {
          return json({ running: false, total: 4, done: 4, games: 1 });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByLabelText(/sélectionner la partie vs opp/i));
    await userEvent.click(screen.getByRole("button", { name: /analyser la sélection/i }));

    // The Player must be left with the completed figure, not an empty page.
    expect(await screen.findByText(/dernière analyse : 1 partie, 4 positions évaluées/i)).toBeTruthy();
  });

  it("sums up the finished pass in Games and Positions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/games")) return json([{ ...GAME }]);
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          return json(
            { running: true, total: 312, done: 0, games: 3, acknowledged: false, started: true },
            202,
          );
        }
        if (url.startsWith("/api/analyze/status")) {
          return json({ running: false, total: 312, done: 312, games: 3, acknowledged: false });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByLabelText(/sélectionner la partie vs opp/i));
    await userEvent.click(screen.getByRole("button", { name: /analyser la sélection/i }));

    expect(await screen.findByText(/dernière analyse : 3 parties, 312 positions évaluées/i)).toBeTruthy();
  });

  it("shows a finished, unacknowledged pass on arrival and lets the Player dismiss it", async () => {
    let acknowledged = false;
    const status = () => ({ running: false, total: 312, done: 312, games: 3, acknowledged });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/games")) return json([{ ...GAME, analyzed: true }]);
        if (url.startsWith("/api/analyze/status")) return json(status());
        if (url.startsWith("/api/analyze/acknowledge") && opts?.method === "POST") {
          acknowledged = true;
          return json(null, 204);
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
      </MemoryRouter>,
    );

    // Nobody started a pass in this page's lifetime: it is the persisted one.
    const summary = await screen.findByText(/dernière analyse : 3 parties, 312 positions évaluées/i);
    expect(summary).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: /fermer/i }));

    expect(screen.queryByText(/312 positions évaluées/i)).toBeNull();
    expect(acknowledged).toBe(true);
  });

  it("says there was nothing to analyze, rather than looking like a failed pass", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/games")) return json([{ ...GAME, analyzed: true }]);
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          // Everything selected is already analyzed: no pass was opened.
          return json(
            { running: false, total: 6, done: 6, games: 1, acknowledged: true, started: false },
            202,
          );
        }
        if (url.startsWith("/api/analyze/status"))
          return json({ running: false, total: 6, done: 6, games: 1, acknowledged: true });
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
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
        if (url.startsWith("/api/games")) return json([{ ...GAME, analyzed: true }]);
        if (url.startsWith("/api/analyze/status"))
          return json({ running: false, total: 6, done: 6, games: 1, acknowledged: true });
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText(/analysée/i)).toBeTruthy(); // the page did load
    expect(screen.queryByText(/positions évaluées/i)).toBeNull();
  });

  it("states how much of the history is analyzed, on arrival", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/games"))
          return json([
            { ...GAME, id: 1, opponent: "a", analyzed: true },
            { ...GAME, id: 2, opponent: "b", analyzed: false },
            { ...GAME, id: 3, opponent: "c", analyzed: false },
          ]);
        if (url.startsWith("/api/analyze/status"))
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
        <GamesPage profile={PROFILE} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/historique : 1 partie analysée sur 3/i)).toBeTruthy();
  });

  it("shows no count at all on an empty history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/games")) return json([]);
        if (url.startsWith("/api/analyze/status"))
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
        <GamesPage profile={PROFILE} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/aucune partie/i)).toBeTruthy();
    expect(screen.queryByText(/analysée/i)).toBeNull();
  });

  it("disables 'Analyser la sélection' until at least one Game is selected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/games")) return json([{ ...GAME }]);
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={PROFILE} />
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

/**
 * The `games-load-failure` finding, folded into this slice: a failed
 * `GET /api/games` used to render the empty-history invitation — the screen
 * announced "no games yet" while 82 Games sat in the database, and pointed the
 * Player at importing what they already had.
 */
describe("GamesPage — an empty history and a failed load are not the same screen", () => {
  const ALICE = {
    id: 7,
    platform: "chesscom" as const,
    username: "Alice",
    createdAt: "",
    games: 0,
    analyzed: 0,
  };

  const status = () =>
    json({ running: false, total: 0, done: 0, games: 0, acknowledged: true, outcome: null, error: null });

  it("says the load failed and offers to retry — never the import invitation", async () => {
    let attempts = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/games")) {
          attempts += 1;
          return json({ error: "boom" }, 500);
        }
        if (url.startsWith("/api/analyze/status")) return status();
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={ALICE} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toBeTruthy();
    // The invitation is right for exactly one state, and this is not it.
    expect(screen.queryByText(/aucune partie|no games yet/i)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: /réessayer/i }));
    expect(attempts).toBeGreaterThan(1);
  });

  it("invites an import when the current Profile genuinely holds no Game", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/games")) return json([]);
        if (url.startsWith("/api/analyze/status")) return status();
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    render(
      <MemoryRouter>
        <GamesPage profile={ALICE} />
      </MemoryRouter>,
    );

    // Named, and pointing at the Profile's own page — importing is an
    // operation ON a Profile (ADR-0014).
    const invitation = await screen.findByText(/aucune partie/i);
    expect(invitation.textContent).toContain("Alice");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
