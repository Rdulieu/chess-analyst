import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
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
  localStorage.clear();
});

const ZERO = { games: 0, win: 0, draw: 0, loss: 0, winRate: null };
const STATS_SUMMARY = {
  total: { games: 1, win: 1, draw: 0, loss: 0, winRate: 1 },
  byCategory: {
    bullet: ZERO,
    blitz: ZERO,
    rapid: { games: 1, win: 1, draw: 0, loss: 0, winRate: 1 },
    classical: ZERO,
    correspondence: ZERO,
  },
  bySide: { white: { games: 1, win: 1, draw: 0, loss: 0, winRate: 1 }, black: ZERO },
};

/** The `Profile` the routed app's Games belong to (US-11). */
const PROFILE = {
  id: 7,
  platform: "chesscom" as const,
  username: "DudulSmash",
  createdAt: "2026-08-18T00:00:00.000Z",
  games: 1,
  analyzed: 0,
};

/** Makes a `Profile` current, as selecting it on `/profiles` would: every
 *  analysis screen is about one, and without a selection they redirect. */
function selectProfile(id = PROFILE.id) {
  localStorage.setItem("chess-analyst.current-profile", String(id));
}

describe("App — routing & navigation", () => {
  beforeEach(() => {
    selectProfile();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL): Promise<Response> => {
        const u = url.toString();
        if (u.startsWith("/api/games") && !u.includes("/api/games/")) return jsonResponse([OPERA_GAME]);
        // Analyzed here so the deep-link test below exercises the board, not US-7's not-yet-analyzed path.
        // Scoped now (ADR-0014): the id alone is no longer the whole URL.
        if (u.startsWith(`/api/games/${OPERA_GAME.id}?`)) return jsonResponse({ ...OPERA_GAME, analyzed: true });
        if (u.startsWith("/api/move-habits")) return jsonResponse({ candidates: [] });
        if (u.startsWith("/api/stats")) return jsonResponse(STATS_SUMMARY);
        if (u.startsWith("/api/openings")) return jsonResponse({ openings: [] });
        if (u.startsWith("/api/danger")) return jsonResponse({ dangers: [], analyzedGames: 0 });
        if (u === "/api/profiles") return jsonResponse([PROFILE]);
        if (u === `/api/profiles/${PROFILE.id}`) return jsonResponse(PROFILE);
        return jsonResponse({}, false, 404);
      }),
    );
  });

  it("aligns the chrome on the same column as the content", async () => {
    const { container } = renderApp(["/"]);

    // The title and the navigation share one alignment wrapper inside the
    // header, so the chrome can line up with the content column instead of
    // running edge to edge.
    const bar = container.querySelector('header [data-column]')!;
    expect(bar).toBeTruthy();
    expect(bar.querySelector("h1")).toBeTruthy();
    expect(bar.querySelector("nav")).toBeTruthy();
    expect(container.querySelector('main [data-column]')).toBeTruthy();
  });

  it("shows the navigation and lands on Mes parties (import form + game list)", async () => {
    renderApp(["/"]);

    // A navigation menu with the two top-level entries.
    const nav = screen.getByRole("navigation");
    expect(nav).toBeTruthy();
    expect(screen.getByRole("link", { name: /mes parties/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /stats/i })).toBeTruthy();

    // The landing page shows the game list — and only it: the import form is
    // an operation on a Profile and lives on that Profile's own page (US-11).
    expect(await screen.findByRole("link", { name: /Duke Karl/i })).toBeTruthy();
    expect(screen.queryByRole("form", { name: /import/i })).toBeNull();
  });

  it("navigates to a Game's Analyse page when it is selected, with the board steppable", async () => {
    const user = userEvent.setup();
    const { container } = renderApp(["/"]);

    await user.click(await screen.findByRole("link", { name: /Duke Karl/i }));

    // The board (which lives only on the Analyse page) renders the starting position.
    await waitFor(() => expect(container.querySelectorAll("[data-piece]")).toHaveLength(32));

    // Previous/Next work exactly as before: Next advances one Move.
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByLabelText("current move").textContent).toBe("e4");
  });

  it("reaches a Profile's own page from the Profils list, and imports from there", async () => {
    const user = userEvent.setup();
    renderApp(["/profiles"]);

    // The row's identity link, named exactly: the screen now also holds an
    // Import button that names the same Profile.
    await user.click(await screen.findByRole("link", { name: "DudulSmash" }));

    expect(await screen.findByRole("heading", { level: 2, name: /DudulSmash/i })).toBeTruthy();
    expect(screen.getByRole("form", { name: /import/i })).toBeTruthy();
  });

  it("navigates to the Profils page from the nav", async () => {
    const user = userEvent.setup();
    renderApp(["/"]);

    await user.click(screen.getByRole("link", { name: /profils/i }));

    expect(await screen.findByRole("heading", { name: /profils/i })).toBeTruthy();
    expect(screen.getByRole("form", { name: /nouveau profil/i })).toBeTruthy();
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

  it("navigates to the Positions dangereuses page from the nav", async () => {
    const user = userEvent.setup();
    renderApp(["/"]);

    await user.click(screen.getByRole("link", { name: /positions dangereuses/i }));

    expect(await screen.findByRole("heading", { name: /positions dangereuses/i })).toBeTruthy();
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
    expect(screen.getByLabelText("current move").textContent).toBe("Start");
  });

  it("moves between pages through the menu, back to Mes parties", async () => {
    const user = userEvent.setup();
    renderApp(["/"]);
    await screen.findByRole("link", { name: /Duke Karl/i });

    await user.click(screen.getByRole("link", { name: /stats/i }));
    expect(await screen.findByText(/par cadence/i)).toBeTruthy();

    await user.click(screen.getByRole("link", { name: /mes parties/i }));
    expect(await screen.findByRole("link", { name: /Duke Karl/i })).toBeTruthy();
  });
});

describe("App — import UI", () => {
  /** The routed app on the Profile's page — where the Import now lives. */
  const renderProfilePage = () => renderApp([`/profiles/${PROFILE.id}`]);

  describe("with an empty history", () => {
    beforeEach(() => {
      selectProfile();
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string | URL): Promise<Response> => {
          const u = url.toString();
          if (u.startsWith("/api/games") && !u.includes("/api/games/")) return jsonResponse([]);
          if (u === `/api/profiles/${PROFILE.id}`) return jsonResponse({ ...PROFILE, games: 0 });
          return jsonResponse({}, false, 404);
        }),
      );
    });

    it("shows the Profile's import form — a range and the categories, no username", async () => {
      renderProfilePage();

      expect(await screen.findByLabelText(/^du$/i)).toBeTruthy();
      expect(screen.getByLabelText(/^au$/i)).toBeTruthy();
      expect(screen.getByRole("button", { name: /^import$/i })).toBeTruthy();
      // The account is the Profile's own: nothing to type, nothing to mistype.
      expect(screen.queryByLabelText(/username/i)).toBeNull();
      // A checkbox per time control category.
      for (const cat of ["bullet", "blitz", "rapid", "classical", "correspondance"]) {
        expect(screen.getByRole("checkbox", { name: new RegExp(cat, "i") })).toBeTruthy();
      }
    });

    it("still invites the Player to import from an empty Mes parties", async () => {
      renderApp(["/"]);

      // Named, and pointing at the Profile's own page: importing is an
      // operation ON a Profile (US-11).
      expect((await screen.findByText(/aucune partie/i)).textContent).toContain("DudulSmash");
    });

    it("defaults both ends of the range to the current month", async () => {
      renderProfilePage();

      const from = (await screen.findByLabelText(/^du$/i)) as HTMLInputElement;
      const to = screen.getByLabelText(/^au$/i) as HTMLInputElement;
      expect(from.value).toBe(currentMonth());
      expect(to.value).toBe(currentMonth());
    });
  });

  it("imports the chosen scope under the Profile whose page it was run from", async () => {
    let imported = false;
    const fetchMock = vi.fn<(url: string | URL, init?: RequestInit) => Promise<Response>>(
      async (url) => {
        const u = url.toString();
        if (u.startsWith("/api/games") && !u.includes("/api/games/")) return jsonResponse(imported ? [OPERA_GAME] : []);
        if (u === `/api/profiles/${PROFILE.id}`)
          return jsonResponse({ ...PROFILE, games: imported ? 1 : 0 });
        if (u === "/api/import") {
          imported = true;
          return jsonResponse({ running: true, total: 2, done: 0, result: null }, true, 202);
        }
        if (u === "/api/import/status") {
          return jsonResponse({
            running: false,
            total: 2,
            done: 2,
            result: {
              totalFetched: 1,
              imported: 1,
              alreadyPresent: 0,
              byCategory: { bullet: 0, blitz: 1, rapid: 0, classical: 0, correspondence: 0 },
              results: { win: 1, draw: 0, loss: 0 },
              months: [
                { month: { year: 2024, month: 2 }, imported: 0, alreadyPresent: 0 },
                { month: { year: 2024, month: 3 }, imported: 1, alreadyPresent: 0 },
              ],
            },
          });
        }
        return jsonResponse({}, false, 404);
      },
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderProfilePage();
    await screen.findByLabelText(/^du$/i);

    fireEvent.change(screen.getByLabelText(/^du$/i), { target: { value: "2024-02" } });
    fireEvent.change(screen.getByLabelText(/^au$/i), { target: { value: "2024-03" } });
    await user.click(screen.getByRole("button", { name: /^import$/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find((c) => c[0] === "/api/import");
      expect(call).toBeTruthy();
      // The Profile is named by the request — the page it ran from IS the scope.
      expect(JSON.parse((call![1] as RequestInit).body as string)).toEqual({
        profileId: PROFILE.id,
        from: { year: 2024, month: 2 },
        to: { year: 2024, month: 3 },
        categories: ["bullet", "blitz", "rapid", "classical", "correspondence"],
      });
    });
    // The post-import summary is shown, and the Profile's counter caught up.
    expect(await screen.findByLabelText(/import summary/i)).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/1 partie importée/i)).toBeTruthy());
  });

  it("shows how many months are done while an Import is in flight, then the summary", async () => {
    let resolveStatus!: (r: Response) => void;
    const statusInFlight = new Promise<Response>((r) => (resolveStatus = r));
    const fetchMock = vi.fn((url: string | URL): Promise<Response> => {
      const u = url.toString();
      if (u.startsWith("/api/games") && !u.includes("/api/games/")) return Promise.resolve(jsonResponse([]));
      if (u === `/api/profiles/${PROFILE.id}`) return Promise.resolve(jsonResponse(PROFILE));
      if (u === "/api/import")
        return Promise.resolve(jsonResponse({ running: true, total: 3, done: 1, result: null }, true, 202));
      if (u === "/api/import/status") return statusInFlight;
      return Promise.resolve(jsonResponse({}, false, 404));
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderProfilePage();
    await screen.findByLabelText(/^du$/i);
    await user.click(screen.getByRole("button", { name: /^import$/i }));

    // While the Import runs, progress is determinate and counted in months.
    const progress = await screen.findByLabelText(/import progress/i);
    expect(progress.textContent).toMatch(/1\s*\/\s*3/);

    // Once it finishes, the readout disappears and the summary shows.
    resolveStatus(
      jsonResponse({
        running: false,
        total: 3,
        done: 3,
        result: {
          totalFetched: 1,
          imported: 1,
          alreadyPresent: 0,
          byCategory: { bullet: 0, blitz: 1, rapid: 0, classical: 0, correspondence: 0 },
          results: { win: 1, draw: 0, loss: 0 },
          months: [{ month: { year: 2024, month: 1 }, imported: 1, alreadyPresent: 0 }],
        },
      }),
    );
    await screen.findByLabelText(/import summary/i);
    expect(screen.queryByLabelText(/import progress/i)).toBeNull();
  });

  it("surfaces an import error without crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL): Promise<Response> => {
        const u = url.toString();
        if (u.startsWith("/api/games") && !u.includes("/api/games/")) return jsonResponse([]);
        if (u === `/api/profiles/${PROFILE.id}`) return jsonResponse(PROFILE);
        if (u === "/api/import")
          return jsonResponse({ error: "Profil introuvable : 7" }, false, 404);
        return jsonResponse({}, false, 404);
      }),
    );
    const user = userEvent.setup();

    renderProfilePage();
    await screen.findByLabelText(/^du$/i);
    await user.click(screen.getByRole("button", { name: /^import$/i }));

    expect(await screen.findByText(/profil introuvable/i)).toBeTruthy();
    // The form is still there — no crash.
    expect(screen.getByRole("button", { name: /^import$/i })).toBeTruthy();
  });
});

/**
 * The banner is what makes the display unable to lie: `/danger` and `/openings`
 * look identical whoever the Player is, and reading a friend's recurring
 * mistakes while believing they are your own is a silent, easy confusion.
 */
describe("App — the chrome names whose figures these are", () => {
  const BOB = { ...PROFILE, id: 8, username: "Bob", games: 4 };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL): Promise<Response> => {
        const u = url.toString();
        if (u.startsWith("/api/games")) return jsonResponse([]);
        if (u.startsWith("/api/danger")) return jsonResponse({ dangers: [], analyzedGames: 0 });
        if (u === "/api/profiles") return jsonResponse([PROFILE, BOB]);
        if (u === `/api/profiles/${PROFILE.id}`) return jsonResponse(PROFILE);
        if (u === `/api/profiles/${BOB.id}`) return jsonResponse(BOB);
        if (u === "/api/analyze/status")
          return jsonResponse({ running: false, total: 0, done: 0, games: 0, acknowledged: true });
        return jsonResponse({}, false, 404);
      }),
    );
  });

  it("names the current Profile in the chrome, with a link to the profiles area", async () => {
    selectProfile();
    const { container } = renderApp(["/danger"]);

    const banner = await screen.findByRole("complementary", { name: /profil courant/i });
    expect(banner.textContent).toContain("DudulSmash");
    // Chrome, not page content: it sits in the header, above the routed page.
    expect(container.querySelector("header")!.contains(banner)).toBe(true);
  });

  it("follows the selection: switching Profile renames the banner with no reload", async () => {
    selectProfile();
    const user = userEvent.setup();
    renderApp(["/profiles"]);

    const list = await screen.findByRole("list", { name: /profils/i });
    const rows = within(list).getAllByRole("listitem");
    const bobRow = rows.find((r) => r.textContent?.includes("Bob"))!;
    await user.click(within(bobRow).getByRole("button", { name: /sélectionner/i }));

    await user.click(screen.getByRole("link", { name: /positions dangereuses/i }));
    const banner = await screen.findByRole("complementary", { name: /profil courant/i });
    await waitFor(() => expect(banner.textContent).toContain("Bob"));
  });

  it("takes the Player to the profiles area when nothing is selected", async () => {
    const { container } = renderApp(["/openings"]);

    expect(await screen.findByRole("form", { name: /nouveau profil/i })).toBeTruthy();
    // Nothing is current, so the chrome names nobody rather than guessing.
    expect(container.querySelector('[data-banner="profile"]')).toBeNull();
  });
});
