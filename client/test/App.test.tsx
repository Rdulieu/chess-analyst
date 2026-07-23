import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { App } from "../src/App";
import { OPERA_GAME } from "./fixtures";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

/** Renders the routed app at a chosen entry point (defaults to the landing page). */
function renderApp(initialEntries: string[] = ["/"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

/** Current month as the form's default value (YYYY-MM). */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

const ZERO = { games: 0, win: 0, draw: 0, loss: 0, winRate: null };
const STATS_SUMMARY = {
  total: { games: 1, win: 1, draw: 0, loss: 0, winRate: 1 },
  byCategory: { bullet: ZERO, blitz: ZERO, rapid: { games: 1, win: 1, draw: 0, loss: 0, winRate: 1 }, daily: ZERO },
  bySide: { white: { games: 1, win: 1, draw: 0, loss: 0, winRate: 1 }, black: ZERO },
};

describe("App — routing & navigation", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL): Promise<Response> => {
        const u = url.toString();
        if (u === "/api/games") return jsonResponse([OPERA_GAME]);
        if (u === `/api/games/${OPERA_GAME.id}`) return jsonResponse(OPERA_GAME);
        if (u.startsWith("/api/move-habits")) return jsonResponse({ candidates: [] });
        if (u === "/api/stats") return jsonResponse(STATS_SUMMARY);
        if (u === "/api/openings") return jsonResponse({ openings: [] });
        return jsonResponse({}, false, 404);
      }),
    );
  });

  it("shows the navigation and lands on Mes parties (import form + game list)", async () => {
    renderApp(["/"]);

    // A navigation menu with the two top-level entries.
    const nav = screen.getByRole("navigation");
    expect(nav).toBeTruthy();
    expect(screen.getByRole("link", { name: /mes parties/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /stats/i })).toBeTruthy();

    // The landing page shows the import form and the game list.
    expect(await screen.findByRole("form", { name: /import/i })).toBeTruthy();
    expect(await screen.findByRole("button", { name: /Duke Karl/i })).toBeTruthy();
  });

  it("navigates to a Game's Analyse page when it is selected, with the board steppable", async () => {
    const user = userEvent.setup();
    const { container } = renderApp(["/"]);

    await user.click(await screen.findByRole("button", { name: /Duke Karl/i }));

    // The board (which lives only on the Analyse page) renders the starting position.
    await waitFor(() => expect(container.querySelectorAll("[data-piece]")).toHaveLength(32));

    // Previous/Next work exactly as before: Next advances one Move.
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByRole("status", { name: "current move" }).textContent).toBe("e4");
  });

  it("navigates to the Explorateur page from the nav", async () => {
    const user = userEvent.setup();
    renderApp(["/"]);

    await user.click(screen.getByRole("link", { name: /explorateur/i }));

    expect(await screen.findByRole("heading", { name: /explorateur/i })).toBeTruthy();
    // The side selector is present (White/Black).
    expect(screen.getByRole("radio", { name: /blancs/i })).toBeTruthy();
  });

  it("navigates to the Ouvertures page from the nav", async () => {
    const user = userEvent.setup();
    renderApp(["/"]);

    await user.click(screen.getByRole("link", { name: /ouvertures/i }));

    expect(await screen.findByRole("heading", { name: /ouvertures/i })).toBeTruthy();
  });

  it("renders the global stats on the Stats page", async () => {
    renderApp(["/stats"]);

    expect(await screen.findByRole("heading", { name: /stats/i })).toBeTruthy();
    // The stats content (breakdowns) renders, not a placeholder.
    expect(await screen.findByText(/par cadence/i)).toBeTruthy();
    expect(screen.getByText(/par côté/i)).toBeTruthy();
  });

  it("loads the Game straight from the URL (reload / deep-link into Analyse)", async () => {
    const { container } = renderApp([`/analyse/${OPERA_GAME.id}`]);

    // No list visit first: the page loads its own Game from the route param.
    await waitFor(() => expect(container.querySelectorAll("[data-piece]")).toHaveLength(32));
    expect(screen.getByRole("status", { name: "current move" }).textContent).toBe("Start");
  });

  it("moves between pages through the menu, back to Mes parties", async () => {
    const user = userEvent.setup();
    renderApp(["/"]);
    await screen.findByRole("button", { name: /Duke Karl/i });

    await user.click(screen.getByRole("link", { name: /stats/i }));
    expect(await screen.findByText(/par cadence/i)).toBeTruthy();

    await user.click(screen.getByRole("link", { name: /mes parties/i }));
    expect(await screen.findByRole("button", { name: /Duke Karl/i })).toBeTruthy();
  });
});

describe("App — import UI", () => {
  describe("with an empty history", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string | URL): Promise<Response> => {
          if (url.toString() === "/api/games") return jsonResponse([]);
          return jsonResponse({}, false, 404);
        }),
      );
    });

    it("invites the Player to import and shows the import form", async () => {
      renderApp();

      await screen.findByText(/import your chess\.com history/i);
      expect(screen.getByLabelText(/username/i)).toBeTruthy();
      expect(screen.getByLabelText(/month/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /^import$/i })).toBeTruthy();
      // A checkbox per time control category.
      for (const cat of ["bullet", "blitz", "rapid", "daily"]) {
        expect(screen.getByRole("checkbox", { name: new RegExp(cat, "i") })).toBeTruthy();
      }
    });

    it("defaults the month to the current month", async () => {
      renderApp();

      const month = (await screen.findByLabelText(/month/i)) as HTMLInputElement;
      expect(month.value).toBe(currentMonth());
    });
  });

  it("imports the chosen scope and then shows the imported Games", async () => {
    let imported = false;
    const fetchMock = vi.fn<(url: string | URL, init?: RequestInit) => Promise<Response>>(
      async (url) => {
        const u = url.toString();
        if (u === "/api/games") return jsonResponse(imported ? [OPERA_GAME] : []);
        if (u === "/api/import") {
          imported = true;
          return jsonResponse({
            totalFetched: 1,
            imported: 1,
            alreadyPresent: 0,
            byCategory: { bullet: 0, blitz: 1, rapid: 0, daily: 0 },
            results: { win: 1, draw: 0, loss: 0 },
          });
        }
        return jsonResponse({}, false, 404);
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderApp();
    await screen.findByText(/import your chess\.com history/i);

    await user.type(screen.getByLabelText(/username/i), "me");
    fireEvent.change(screen.getByLabelText(/month/i), { target: { value: "2024-03" } });
    await user.click(screen.getByRole("button", { name: /^import$/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((c) => c[0] === "/api/import");
      expect(call).toBeTruthy();
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({
        username: "me",
        year: 2024,
        month: 3,
        categories: ["bullet", "blitz", "rapid", "daily"],
      });
    });
    expect(await screen.findByText(/Duke Karl/)).toBeTruthy();
    // The post-import summary is shown.
    expect(await screen.findByLabelText(/import summary/i)).toBeTruthy();
  });

  it("shows a progress indicator while an import is in flight, then the summary", async () => {
    let resolveImport!: (r: Response) => void;
    const importInFlight = new Promise<Response>((r) => (resolveImport = r));
    const fetchMock = vi.fn((url: string | URL): Promise<Response> => {
      const u = url.toString();
      if (u === "/api/games") return Promise.resolve(jsonResponse([]));
      if (u === "/api/import") return importInFlight;
      return Promise.resolve(jsonResponse({}, false, 404));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderApp();
    await screen.findByText(/import your chess\.com history/i);
    await user.type(screen.getByLabelText(/username/i), "me");
    await user.click(screen.getByRole("button", { name: /^import$/i }));

    // While the import is pending, a progress indicator is shown.
    expect(await screen.findByRole("progressbar")).toBeTruthy();

    // Once it resolves, the indicator disappears and the summary shows.
    resolveImport(
      jsonResponse({
        totalFetched: 1,
        imported: 1,
        alreadyPresent: 0,
        byCategory: { bullet: 0, blitz: 1, rapid: 0, daily: 0 },
        results: { win: 1, draw: 0, loss: 0 },
      }),
    );
    await screen.findByLabelText(/import summary/i);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("prefills the username from stored settings and saves it on import", async () => {
    const puts: unknown[] = [];
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit): Promise<Response> => {
      const u = url.toString();
      if (u === "/api/settings" && init?.method === "PUT") {
        const body = JSON.parse(init.body as string);
        puts.push(body);
        return jsonResponse(body);
      }
      if (u === "/api/settings") return jsonResponse({ username: "storeduser" });
      if (u === "/api/games") return jsonResponse([]);
      if (u === "/api/import")
        return jsonResponse({
          totalFetched: 0,
          imported: 0,
          alreadyPresent: 0,
          byCategory: { bullet: 0, blitz: 0, rapid: 0, daily: 0 },
          results: { win: 0, draw: 0, loss: 0 },
          message: "No games found.",
        });
      return jsonResponse({}, false, 404);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderApp();

    // Username is prefilled from the stored settings.
    await waitFor(() =>
      expect((screen.getByLabelText(/username/i) as HTMLInputElement).value).toBe("storeduser"),
    );

    // Importing persists the username.
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    await waitFor(() => expect(puts).toContainEqual({ username: "storeduser" }));
  });

  it("surfaces an import error without crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL): Promise<Response> => {
        const u = url.toString();
        if (u === "/api/games") return jsonResponse([]);
        if (u === "/api/import")
          return jsonResponse({ error: "Unknown chess.com username: ghost" }, false, 404);
        return jsonResponse({}, false, 404);
      }),
    );
    const user = userEvent.setup();

    renderApp();
    await screen.findByText(/import your chess\.com history/i);
    await user.type(screen.getByLabelText(/username/i), "ghost");
    await user.click(screen.getByRole("button", { name: /^import$/i }));

    expect(await screen.findByText(/unknown chess\.com username/i)).toBeTruthy();
    // The form is still there — no crash.
    expect(screen.getByRole("button", { name: /^import$/i })).toBeTruthy();
  });
});
