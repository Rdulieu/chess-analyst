import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StatsPage } from "../src/pages/StatsPage";
import type { StatsSummary } from "../src/types";

const bucket = (games: number, win: number, draw: number, loss: number): StatsSummary["total"] => ({
  games,
  win,
  draw,
  loss,
  winRate: games === 0 ? null : (win + 0.5 * draw) / games,
});

const SUMMARY: StatsSummary = {
  total: bucket(2, 1, 0, 1), // 50%
  byCategory: {
    bullet: bucket(0, 0, 0, 0),
    blitz: bucket(2, 1, 0, 1), // 50%
    rapid: bucket(0, 0, 0, 0),
    daily: bucket(0, 0, 0, 0),
  },
  bySide: {
    white: bucket(2, 1, 0, 1),
    black: bucket(0, 0, 0, 0),
  },
};

/** The current `Profile` the page is about — every scoped page takes one. */
const PROFILE = {
  id: 7,
  platform: "chesscom" as const,
  username: "Alice",
  createdAt: "",
  games: 2,
  analyzed: 0,
};

function stub(summary: StatsSummary) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => summary }) as Response),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("StatsPage", () => {
  it("renders the total, per-cadence and per-side breakdowns as one grouped table", async () => {
    stub(SUMMARY);
    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    const table = await screen.findByRole("table", { name: /résultats/i });

    // Total: games count and overall win rate, on its own group's row.
    const total = within(table).getByRole("rowgroup", { name: /^total$/i });
    expect(within(total).getByRole("row").textContent).toContain("2");
    expect(within(total).getByRole("row").textContent).toContain("50");

    // Per cadence: a played cadence shows its rate; an unplayed one shows 0 with no rate.
    const cadence = within(table).getByRole("rowgroup", { name: /cadence/i });
    expect(within(cadence).getByRole("row", { name: /blitz/i }).textContent).toContain("50");
    const rapid = within(cadence).getByRole("row", { name: /rapid/i });
    expect(rapid.textContent).toContain("0");
    expect(rapid.textContent).not.toContain("%");

    // Per side present, in the side group.
    const side = within(table).getByRole("rowgroup", { name: /côté|side/i });
    expect(within(side).getByRole("row", { name: /blancs/i })).toBeTruthy();
    expect(within(side).getByRole("row", { name: /noirs/i })).toBeTruthy();
  });

  it("wraps its table in its own scroll container, so a wide table never scrolls the page", async () => {
    stub(SUMMARY);
    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    const table = await screen.findByRole("table", { name: /résultats/i });
    expect(table.parentElement?.dataset.scroll).toBe("x");
  });

  it("keeps each figure in its own cell: games, tally and Win rate", async () => {
    stub(SUMMARY);
    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    const table = await screen.findByRole("table", { name: /résultats/i });
    const blitz = within(table).getByRole("row", { name: /blitz/i });
    const cells = within(blitz).getAllByRole("cell");

    expect(cells).toHaveLength(3);
    expect(cells[0].textContent).toMatch(/2 parties/i);
    expect(cells[1].textContent).toMatch(/1/); // the win/draw/loss tally
    expect(cells[2].textContent).toMatch(/50 %/);
  });

  it("shows only an invitation when there are no imported Games", async () => {
    const empty: StatsSummary = {
      total: bucket(0, 0, 0, 0),
      byCategory: {
        bullet: bucket(0, 0, 0, 0),
        blitz: bucket(0, 0, 0, 0),
        rapid: bucket(0, 0, 0, 0),
        daily: bucket(0, 0, 0, 0),
      },
      bySide: { white: bucket(0, 0, 0, 0), black: bucket(0, 0, 0, 0) },
    };
    stub(empty);
    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/aucune partie/i)).toBeTruthy();
    // No results table at all in the empty state.
    expect(screen.queryByRole("table", { name: /résultats/i })).toBeNull();
  });
});

describe("StatsPage — the three load outcomes stay apart", () => {
  const PROFILE = {
    id: 7,
    platform: "chesscom" as const,
    username: "Alice",
    createdAt: "",
    games: 0,
    analyzed: 0,
  };

  it("says the load failed and offers to retry, instead of reading as an empty history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response),
    );

    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText(/aucune partie importée/i)).toBeNull();
    expect(screen.getByRole("button", { name: /réessayer/i })).toBeTruthy();
  });

  it("invites an import for a Profile that genuinely has no Game", async () => {
    stub({ ...SUMMARY, total: bucket(0, 0, 0, 0) });

    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/aucune partie/i)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
