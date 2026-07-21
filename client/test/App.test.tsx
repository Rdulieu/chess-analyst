import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { App } from "../src/App";
import { OPERA_GAME } from "./fixtures";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as Response;
}

/** Current month as the form's default value (YYYY-MM). */
function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

afterEach(() => {
  vi.unstubAllGlobals();
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
      render(<App />);

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
      render(<App />);

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

    render(<App />);
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

    render(<App />);
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

  it("opens a selected Game on the board", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL): Promise<Response> => {
        if (url.toString() === "/api/games") return jsonResponse([OPERA_GAME]);
        return jsonResponse({}, false, 404);
      }),
    );
    const user = userEvent.setup();

    const { container } = render(<App />);
    const gameButton = await screen.findByRole("button", { name: /Duke Karl/i });

    await user.click(gameButton);

    await waitFor(() => {
      expect(container.querySelectorAll("[data-piece]")).toHaveLength(32);
    });
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

    render(<App />);
    await screen.findByText(/import your chess\.com history/i);
    await user.type(screen.getByLabelText(/username/i), "ghost");
    await user.click(screen.getByRole("button", { name: /^import$/i }));

    expect(await screen.findByText(/unknown chess\.com username/i)).toBeTruthy();
    // The form is still there — no crash.
    expect(screen.getByRole("button", { name: /^import$/i })).toBeTruthy();
  });
});
