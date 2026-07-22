import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExplorerPage } from "../src/pages/ExplorerPage";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

const WHITE = [
  {
    san: "e4",
    count: 3,
    win: 1,
    draw: 1,
    loss: 1,
    winRate: 0.5,
    byCategory: { bullet: 0, blitz: 2, rapid: 1, daily: 0 },
  },
];
const BLACK = [
  {
    san: "d4",
    count: 2,
    win: 0,
    draw: 0,
    loss: 2,
    winRate: 0,
    byCategory: { bullet: 0, blitz: 2, rapid: 0, daily: 0 },
  },
];

/** fetch stub returning White or Black candidates by the `side` query param. */
function stubHabits() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL): Promise<Response> => {
      const side = new URL(url.toString(), "http://localhost").searchParams.get("side");
      const candidates = side === "black" ? BLACK : WHITE;
      return { ok: true, status: 200, json: async () => ({ candidates }) } as Response;
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("ExplorerPage", () => {
  it("shows the White candidates from the starting Position with frequency, win rate and per-cadence breakdown", async () => {
    stubHabits();
    render(<ExplorerPage />);

    const list = await screen.findByRole("list", { name: /candidates/i });
    const e4 = within(list).getByRole("listitem").textContent ?? "";
    expect(e4).toContain("e4");
    expect(e4).toContain("3"); // frequency
    expect(e4).toContain("50%"); // win rate
    expect(e4).toMatch(/blitz\D*2/i); // per-cadence breakdown
    expect(e4).toMatch(/rapid\D*1/i);
  });

  it("switches the shown candidates when the side selector changes to Black", async () => {
    stubHabits();
    const user = userEvent.setup();
    render(<ExplorerPage />);
    await screen.findByText("e4");

    await user.click(screen.getByRole("radio", { name: /noirs|black/i }));

    expect(await screen.findByText("d4")).toBeTruthy();
    expect(screen.queryByText("e4")).toBeNull();
  });
});

/** fetch stub: the starting Position offers e4; any deeper Position offers e5. */
function stubDrill() {
  const level0 = [{ san: "e4", count: 3, win: 1, draw: 1, loss: 1, winRate: 0.5, byCategory: { bullet: 0, blitz: 3, rapid: 0, daily: 0 } }];
  const level1 = [{ san: "e5", count: 2, win: 2, draw: 0, loss: 0, winRate: 1, byCategory: { bullet: 0, blitz: 2, rapid: 0, daily: 0 } }];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL): Promise<Response> => {
      const fen = new URL(url.toString(), "http://localhost").searchParams.get("fen");
      const candidates = fen === START ? level0 : level1;
      return { ok: true, status: 200, json: async () => ({ candidates }) } as Response;
    }),
  );
}

describe("ExplorerPage — drill-down", () => {
  it("descends into a selected candidate, showing the resulting Position's candidates and a breadcrumb", async () => {
    stubDrill();
    const user = userEvent.setup();
    render(<ExplorerPage />);
    await screen.findByText("e4");

    await user.click(screen.getByRole("button", { name: "e4" }));

    // The candidates list now shows the resulting Position's candidates, not e4.
    const list = await screen.findByRole("list", { name: /candidates/i });
    expect(within(list).getByText("e5")).toBeTruthy();
    expect(within(list).queryByText("e4")).toBeNull();

    // The breadcrumb reflects the Move taken.
    const breadcrumb = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(within(breadcrumb).getByText("e4")).toBeTruthy();
  });

  it("returns to an earlier level when a breadcrumb entry is selected", async () => {
    stubDrill();
    const user = userEvent.setup();
    render(<ExplorerPage />);
    await user.click(await screen.findByRole("button", { name: "e4" }));
    await screen.findByText("e5"); // now one level deep

    const breadcrumb = screen.getByRole("navigation", { name: /breadcrumb/i });
    await user.click(within(breadcrumb).getByRole("button", { name: /départ/i }));

    const list = await screen.findByRole("list", { name: /candidates/i });
    expect(within(list).getByText("e4")).toBeTruthy();
    expect(within(list).queryByText("e5")).toBeNull();
  });

  it("offers no further descent when the Position has no recorded candidates (the depth cap manifests here)", async () => {
    const level0 = [{ san: "e4", count: 3, win: 1, draw: 1, loss: 1, winRate: 0.5, byCategory: { bullet: 0, blitz: 3, rapid: 0, daily: 0 } }];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL): Promise<Response> => {
        const fen = new URL(url.toString(), "http://localhost").searchParams.get("fen");
        const candidates = fen === START ? level0 : [];
        return { ok: true, status: 200, json: async () => ({ candidates }) } as Response;
      }),
    );
    const user = userEvent.setup();
    render(<ExplorerPage />);

    await user.click(await screen.findByRole("button", { name: "e4" }));

    expect(await screen.findByText(/aucun coup enregistré/i)).toBeTruthy();
    expect(screen.queryByRole("list", { name: /candidates/i })).toBeNull();
  });
});
