import { afterEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DangerPage } from "../src/pages/DangerPage";
import type { DangerEntry } from "../src/types";

function stub(dangers: DangerEntry[], analyzedGames = dangers.length) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        ({ ok: true, status: 200, json: async () => ({ dangers, analyzedGames }) }) as Response,
    ),
  );
}

afterEach(() => vi.unstubAllGlobals());

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";
const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -";

const ENTRIES: DangerEntry[] = [
  { fen: START_FEN, reached: 5, seriousErrors: 1, proportion: 0.2 },
  { fen: AFTER_E4_E5, reached: 3, seriousErrors: 2, proportion: 2 / 3 },
];

describe("DangerPage — the four states", () => {
  it("announces the computation in a live region while the response is in flight", async () => {
    let release!: (value: unknown) => void;
    const pending = new Promise((resolve) => (release = resolve));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await pending;
        return { ok: true, status: 200, json: async () => ({ dangers: [], analyzedGames: 0 }) } as Response;
      }),
    );

    render(<DangerPage />);

    // Never blank and silent: a text readout, announced rather than only drawn.
    const status = screen.getByRole("status");
    expect(status.textContent).toMatch(/calcul|recherche/i);
    expect(screen.queryByText(/analysez vos parties/i)).toBeNull();

    release(null);
    expect(await screen.findByText(/analysez vos parties/i)).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("names a failed request and offers to retry, never to analyse", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response),
    );

    render(<DangerPage />);

    const error = await screen.findByRole("alert");
    expect(error.textContent).toMatch(/erreur|échec|impossible/i);
    // The failure is not "you have analyzed nothing" — saying so would send the
    // Player back to what they just did.
    expect(screen.queryByText(/analysez vos parties/i)).toBeNull();
    expect(screen.getByRole("button", { name: /réessayer/i })).toBeTruthy();
    // Names *what* failed, not just the operation: a server down (502) and a
    // server bug (500) must not read identically, to the Player or to support.
    expect(error.textContent).toMatch(/500/);
  });

  it("renders the Positions when the retry succeeds, without a reload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response)
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ dangers: ENTRIES, analyzedGames: 4 }),
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(<DangerPage />);
    fireEvent.click(await screen.findByRole("button", { name: /réessayer/i }));

    const list = await screen.findByRole("list", { name: /positions dangereuses/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("tells a Player with analyzed Games but no recurring Position what is missing", async () => {
    stub([], 1);

    render(<DangerPage />);

    const message = await screen.findByText(/repassent pas|ne reviennent pas|même position/i);
    expect(message).toBeTruthy();
    // Not "analysez vos parties" — they just did.
    expect(screen.queryByText(/analysez vos parties/i)).toBeNull();
    expect(message.textContent).toMatch(/analysez d'autres|davantage|plus de parties/i);
  });
});

describe("DangerPage", () => {
  it("shows only an invitation when no Game has been analyzed", async () => {
    stub([]);
    render(<DangerPage />);

    expect(await screen.findByText(/analysez vos parties/i)).toBeTruthy();
    expect(screen.queryByRole("list", { name: /positions dangereuses/i })).toBeNull();
  });

  it("renders a board diagram per Position, with its reach count and proportion, in the served order", async () => {
    stub(ENTRIES);
    render(<DangerPage />);

    const list = await screen.findByRole("list", { name: /positions dangereuses/i });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    expect(items[0].textContent).toMatch(/5/);
    expect(items[0].textContent).toMatch(/20/); // 20 %
    expect(items[0].querySelectorAll("[data-piece]")).toHaveLength(32); // starting Position

    expect(items[1].textContent).toMatch(/3/);
    expect(items[1].textContent).toMatch(/67/); // 2/3 rounded
  });

  it("asks for the wide column: a wall of diagrams is not reading-column material", async () => {
    stub(ENTRIES);
    render(<DangerPage />);

    const region = await screen.findByRole("region", { name: /positions dangereuses/i });
    expect(region.dataset.width).toBe("wide");
  });

  it("presents each entry as one self-contained card inside the list", async () => {
    stub(ENTRIES);
    render(<DangerPage />);

    const list = await screen.findByRole("list", { name: /positions dangereuses/i });
    const items = within(list).getAllByRole("listitem");

    for (const item of items) {
      // One card per entry, and everything the entry says lives inside it:
      // the diagram, the side to move and the figures.
      const card = within(item).getByRole("article");
      expect(within(card).getByLabelText(/trait/i)).toBeTruthy();
      expect(card.querySelectorAll("[data-piece]").length).toBeGreaterThan(0);
      expect(card.textContent).toMatch(/fois atteinte/i);
    }
  });

  it("visibly highlights entries with a serious-error proportion of 50% or more, and only those", async () => {
    stub(ENTRIES); // 20% then 67%
    render(<DangerPage />);

    const list = await screen.findByRole("list", { name: /positions dangereuses/i });
    const items = within(list).getAllByRole("listitem");

    expect(items[0].getAttribute("data-serious")).toBeNull();
    expect(items[0].style.backgroundColor).toBe("");
    expect(within(items[0]).queryByLabelText(/dangereuse/i)).toBeNull();

    expect(items[1].getAttribute("data-serious")).toBe("true");
    expect(items[1].style.backgroundColor).not.toBe("");
    expect(within(items[1]).getByLabelText(/dangereuse/i)).toBeTruthy();
  });
});

describe("DangerPage — how many are shown", () => {
  /** A distinct legal Position per index: the two kings plus one White pawn,
   *  walked across the files and up the ranks. */
  function pawnFen(i: number): string {
    const file = i % 8;
    const rank = 2 + Math.floor(i / 8); // ranks 2..6, 40 squares — enough here
    const pawnRow = [file, "P", 7 - file].filter((p) => p !== 0).join("");
    const rows = ["4k3", "8", "8", "8", "8", "8", "8", "4K3"];
    rows[8 - rank] = pawnRow;
    return `${rows.join("/")} w - -`;
  }

  /** `n` distinct served entries, most dangerous first (the server's own order). */
  function ranked(n: number): DangerEntry[] {
    return Array.from({ length: n }, (_, i) => ({
      fen: pawnFen(i),
      reached: 2,
      seriousErrors: 1,
      proportion: 0.5,
    }));
  }

  it("renders every Position when they fit under the display cap", async () => {
    stub(ranked(30));
    render(<DangerPage />);

    const list = await screen.findByRole("list", { name: /positions dangereuses/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(30);
  });

  it("renders at most 30 diagrams and states the real total beyond that", async () => {
    stub(ranked(42));
    render(<DangerPage />);

    const list = await screen.findByRole("list", { name: /positions dangereuses/i });
    expect(within(list).getAllByRole("listitem")).toHaveLength(30);
    expect(screen.getByText(/42/)).toBeTruthy();
  });
});

describe("DangerPage — board orientation", () => {
  const BLACK_TO_MOVE = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -";

  /** The squares of one entry's diagram, in layout order — the first is its top-left corner. */
  function squareOrder(item: HTMLElement): string[] {
    return [...item.querySelectorAll("[data-square]")].map((el) => el.getAttribute("data-square")!);
  }

  async function entries(dangers: DangerEntry[]) {
    stub(dangers);
    render(<DangerPage />);
    const list = await screen.findByRole("list", { name: /positions dangereuses/i });
    return within(list).getAllByRole("listitem");
  }

  it("shows White at the bottom for a White-to-move Position", async () => {
    const [item] = await entries([{ fen: START_FEN, reached: 5, seriousErrors: 1, proportion: 0.2 }]);

    expect(squareOrder(item)[0]).toBe("a8");
  });

  it("shows Black at the bottom for a Black-to-move Position", async () => {
    const [item] = await entries([
      { fen: BLACK_TO_MOVE, reached: 4, seriousErrors: 1, proportion: 0.25 },
    ]);

    expect(squareOrder(item)[0]).toBe("h1");
  });

  it("orients each entry independently, from its own stored 4-field FEN", async () => {
    const items = await entries([
      { fen: START_FEN, reached: 5, seriousErrors: 1, proportion: 0.2 },
      { fen: BLACK_TO_MOVE, reached: 4, seriousErrors: 1, proportion: 0.25 },
    ]);

    expect(squareOrder(items[0])[0]).toBe("a8");
    expect(squareOrder(items[1])[0]).toBe("h1");
  });

  it("states the side to move in text on every entry", async () => {
    const items = await entries([
      { fen: START_FEN, reached: 5, seriousErrors: 1, proportion: 0.2 },
      { fen: BLACK_TO_MOVE, reached: 4, seriousErrors: 1, proportion: 0.25 },
    ]);

    expect(within(items[0]).getByLabelText(/trait/i).textContent).toMatch(/blancs/i);
    expect(within(items[1]).getByLabelText(/trait/i).textContent).toMatch(/noirs/i);
  });

  it("never attributes a side to the Player — a Danger position merges both", async () => {
    const items = await entries([
      { fen: START_FEN, reached: 5, seriousErrors: 1, proportion: 0.2 },
      { fen: BLACK_TO_MOVE, reached: 4, seriousErrors: 1, proportion: 0.25 },
    ]);

    // The 4-field FEN identity does not carry the side the Player played, so
    // one entry merges Games played as White and as Black: "your side" would
    // be a lie here (CONTEXT.md → Board orientation).
    for (const item of items) {
      expect(item.textContent).not.toMatch(/vous|votre/i);
    }
  });
});
