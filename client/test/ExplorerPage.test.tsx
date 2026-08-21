import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExplorerPage } from "../src/pages/ExplorerPage";

/** The current `Profile` the page is about — every scoped page takes one. */
const PROFILE = {
  id: 7,
  platform: "chesscom" as const,
  username: "Alice",
  createdAt: "",
  games: 3,
  analyzed: 0,
};

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
  it("asks for the wide column: a diagram beside its candidates needs the room", async () => {
    stubHabits();
    render(<ExplorerPage profile={PROFILE} />);

    // Split inside the 72ch reading column, the diagram was down to 317px on a
    // wide screen — the screen is one of the three dense ones and reads its board
    // beside its candidates, so it takes the wide variant like the other two.
    const region = await screen.findByRole("region", { name: /explorateur/i });
    expect(region.dataset.width).toBe("wide");
  });

  it("shows the White candidates from the starting Position with frequency, win rate and per-cadence breakdown", async () => {
    stubHabits();
    render(<ExplorerPage profile={PROFILE} />);

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
    render(<ExplorerPage profile={PROFILE} />);
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
    render(<ExplorerPage profile={PROFILE} />);
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
    render(<ExplorerPage profile={PROFILE} />);
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
    render(<ExplorerPage profile={PROFILE} />);

    await user.click(await screen.findByRole("button", { name: "e4" }));

    expect(await screen.findByText(/aucun coup enregistré/i)).toBeTruthy();
    expect(screen.queryByRole("list", { name: /candidates/i })).toBeNull();
  });

  it("renders the board and descends when a candidate's target square is clicked", async () => {
    stubDrill();
    const user = userEvent.setup();
    const { container } = render(<ExplorerPage profile={PROFILE} />);
    await screen.findByText("e4");

    // The interactive board is present at the current Position.
    const e4Square = container.querySelector('[data-square="e4"]');
    expect(e4Square).toBeTruthy();

    // Clicking the target square of the e4 candidate descends like the list would.
    await user.click(e4Square!);

    const list = await screen.findByRole("list", { name: /candidates/i });
    expect(within(list).getByText("e5")).toBeTruthy();
    const breadcrumb = screen.getByRole("navigation", { name: /breadcrumb/i });
    expect(within(breadcrumb).getByText("e4")).toBeTruthy();
  });
});

describe("ExplorerPage — board orientation", () => {
  /** The squares as laid out: the first is the board's top-left corner. */
  function squareOrder(container: HTMLElement): string[] {
    return [...container.querySelectorAll("[data-square]")].map(
      (el) => el.getAttribute("data-square")!,
    );
  }

  const sideToMoveText = () => screen.getByLabelText(/trait/i).textContent ?? "";

  it("shows White at the bottom while exploring as White", async () => {
    stubHabits();
    const { container } = render(<ExplorerPage profile={PROFILE} />);
    await screen.findByText("e4");

    expect(squareOrder(container)[0]).toBe("a8");
  });

  it("flips the board when the side explored changes, with no control but the existing selector", async () => {
    stubHabits();
    const user = userEvent.setup();
    const { container } = render(<ExplorerPage profile={PROFILE} />);
    await screen.findByText("e4");
    const before = screen.getAllByRole("radio").length + screen.getAllByRole("button").length;

    await user.click(screen.getByRole("radio", { name: /noirs/i }));
    await screen.findByText("d4");

    expect(squareOrder(container)[0]).toBe("h1");
    expect(screen.getAllByRole("radio").length + screen.getAllByRole("button").length).toBe(before);
  });

  it("does not flip when drilling down to a level where the opponent has the move", async () => {
    stubHabits();
    const user = userEvent.setup();
    const { container } = render(<ExplorerPage profile={PROFILE} />);
    await screen.findByText("e4");

    await user.click(within(screen.getByRole("list", { name: /candidates/i })).getByRole("button"));

    // Black has the move after 1. e4, but the Player is walking their White repertoire.
    expect(sideToMoveText()).toMatch(/noirs/i);
    expect(squareOrder(container)[0]).toBe("a8");
  });

  it("does not flip while exploring as Black either, at any level", async () => {
    stubHabits();
    const user = userEvent.setup();
    const { container } = render(<ExplorerPage profile={PROFILE} />);
    await screen.findByText("e4");

    await user.click(screen.getByRole("radio", { name: /noirs/i }));
    await screen.findByText("d4");
    await user.click(within(screen.getByRole("list", { name: /candidates/i })).getByRole("button"));

    expect(squareOrder(container)[0]).toBe("h1");
  });

  it("keeps the orientation when walking back up the breadcrumb", async () => {
    stubHabits();
    const user = userEvent.setup();
    const { container } = render(<ExplorerPage profile={PROFILE} />);
    await screen.findByText("e4");
    await user.click(screen.getByRole("radio", { name: /noirs/i }));
    await screen.findByText("d4");
    await user.click(within(screen.getByRole("list", { name: /candidates/i })).getByRole("button"));

    const breadcrumb = screen.getByRole("navigation", { name: /breadcrumb/i });
    await user.click(within(breadcrumb).getByRole("button", { name: /départ/i }));

    expect(squareOrder(container)[0]).toBe("h1");
  });

  it("states the side to move, and follows it down the line", async () => {
    stubHabits();
    const user = userEvent.setup();
    render(<ExplorerPage profile={PROFILE} />);
    await screen.findByText("e4");

    expect(sideToMoveText()).toMatch(/blancs/i);

    await user.click(within(screen.getByRole("list", { name: /candidates/i })).getByRole("button"));
    expect(sideToMoveText()).toMatch(/noirs/i);
  });

  it("never attributes a side to the Player through the side-to-move readout", async () => {
    stubHabits();
    render(<ExplorerPage profile={PROFILE} />);
    await screen.findByText("e4");

    // The readout is about the Position, not about who the Player is.
    expect(sideToMoveText()).not.toMatch(/vous|votre/i);
  });
});

describe("ExplorerPage — whose repertoire this is", () => {
  it("aggregates the current Profile's counters: two players' lines never merge into one", async () => {
    const fetchMock = vi.fn<(url: string | URL) => Promise<Response>>(
      async () => ({ ok: true, status: 200, json: async () => ({ candidates: WHITE }) }) as Response,
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<ExplorerPage profile={PROFILE} />);

    await screen.findByRole("list", { name: /candidates/i });
    expect(String(fetchMock.mock.calls[0][0])).toContain("profileId=7");
  });

  it("says the load failed and offers to retry, rather than reading as a line nobody ever played", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response),
    );

    render(<ExplorerPage profile={PROFILE} />);

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText(/aucun coup enregistré/i)).toBeNull();
  });
});
