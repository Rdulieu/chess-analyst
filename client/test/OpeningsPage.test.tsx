import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { OpeningsPage } from "../src/pages/OpeningsPage";
import type { WeakOpeningEntry } from "../src/types";

const ENTRIES: WeakOpeningEntry[] = [
  // Weak: 4 games, 1 win / 3 loss → 25%
  {
    eco: "B22",
    openingName: "Sicilian Defense Alapin Variation",
    side: "white",
    cadence: "blitz",
    games: 4,
    win: 1,
    draw: 0,
    loss: 3,
    winRate: 0.25,
  },
  // Strong: 2 games, both wins → 100%
  {
    eco: "C50",
    openingName: "Italian Game",
    side: "black",
    cadence: "rapid",
    games: 2,
    win: 2,
    draw: 0,
    loss: 0,
    winRate: 1,
  },
];

function stub(openings: WeakOpeningEntry[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ openings }) }) as Response),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("OpeningsPage", () => {
  it("asks for the wide column: six columns of figures do not fit the reading column", async () => {
    stub(ENTRIES);
    render(<OpeningsPage />);

    // With `Opening` names past sixty characters, the reading column left no room
    // for the five figure columns and they scrolled out of sight.
    const region = await screen.findByRole("region", { name: /ouvertures/i });
    expect(region.dataset.width).toBe("wide");
  });

  it("wraps its table in its own scroll container, so a wide table never scrolls the page", async () => {
    stub(ENTRIES);
    render(<OpeningsPage />);

    const table = await screen.findByRole("table", { name: /ouvertures/i });
    expect(table.parentElement?.dataset.scroll).toBe("x");
  });

  it("renders a row per entry — opening name · ECO, side, cadence, spelled-out tally, Win rate — in the order served", async () => {
    stub(ENTRIES);
    render(<OpeningsPage />);

    const table = await screen.findByRole("table", { name: /ouvertures/i });
    const rows = within(table).getAllByRole("row");
    // rows[0] is the header; data rows follow in the served order (games desc).
    expect(rows[1].textContent).toContain("Sicilian Defense Alapin Variation");
    expect(rows[1].textContent).toContain("B22");
    expect(rows[1].textContent).toContain("Blancs");
    expect(rows[1].textContent).toMatch(/blitz/i);
    expect(rows[1].textContent).toContain("25"); // 25 %
    expect(within(rows[1]).getByLabelText(/1 victoire.*0 nulle.*3 défaite/i)).toBeTruthy();

    expect(rows[2].textContent).toContain("Italian Game");
    expect(rows[2].textContent).toContain("Noirs");
    expect(rows[2].textContent).toContain("100");
  });

  it("visibly highlights entries under a 50% Win rate for review, and only those", async () => {
    stub(ENTRIES);
    render(<OpeningsPage />);

    const table = await screen.findByRole("table", { name: /ouvertures/i });
    const rows = within(table).getAllByRole("row");
    // The 25% Sicilian is flagged weak: the `data-weak` hook the stylesheet tints
    // from, and — the cue that does not depend on colour at all — an accessible
    // "à revoir" marker. jsdom never loads the sheet, so the tint itself is
    // measured by the Feature Path, in both themes; here only the wiring is.
    expect(rows[1].getAttribute("data-weak")).toBe("true");
    expect(rows[1].getAttribute("style")).toBeNull();
    expect(within(rows[1]).getByLabelText(/faible|à revoir/i)).toBeTruthy();
    // The 100% Italian is not marked in any of those ways.
    expect(rows[2].getAttribute("data-weak")).toBeNull();
    expect(within(rows[2]).queryByLabelText(/faible|à revoir/i)).toBeNull();
  });

  it("does not highlight an opening at exactly 50%", async () => {
    stub([{ ...ENTRIES[0], games: 2, win: 1, draw: 0, loss: 1, winRate: 0.5 }]);
    render(<OpeningsPage />);

    const table = await screen.findByRole("table", { name: /ouvertures/i });
    const rows = within(table).getAllByRole("row");
    expect(rows[1].getAttribute("data-weak")).toBeNull();
    expect(within(rows[1]).queryByLabelText(/faible|à revoir/i)).toBeNull();
  });

  it("shows only an invitation when there are no played openings", async () => {
    stub([]);
    render(<OpeningsPage />);

    expect(await screen.findByText(/aucune partie importée/i)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
