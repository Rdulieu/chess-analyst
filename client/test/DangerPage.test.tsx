import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DangerPage } from "../src/pages/DangerPage";
import type { DangerEntry } from "../src/types";

function stub(dangers: DangerEntry[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ dangers }) }) as Response),
  );
}

afterEach(() => vi.unstubAllGlobals());

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";
const AFTER_E4_E5 = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -";

const ENTRIES: DangerEntry[] = [
  { fen: START_FEN, reached: 5, seriousErrors: 1, proportion: 0.2 },
  { fen: AFTER_E4_E5, reached: 3, seriousErrors: 2, proportion: 2 / 3 },
];

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
