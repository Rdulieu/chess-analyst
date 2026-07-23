import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

function stub(summary: StatsSummary) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, json: async () => summary }) as Response),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("StatsPage", () => {
  it("renders the total, per-cadence and per-side breakdowns", async () => {
    stub(SUMMARY);
    render(<StatsPage />);

    // Total: games count and overall win rate.
    const total = await screen.findByLabelText(/^total$/i);
    expect(total.textContent).toContain("2");
    expect(total.textContent).toContain("50");

    // Per cadence: a played cadence shows its rate; an unplayed one shows 0 with no rate.
    const cadence = screen.getByRole("list", { name: /cadence/i });
    expect(within(cadence).getByText(/blitz/i).closest("li")!.textContent).toContain("50");
    const rapid = within(cadence).getByText(/rapid/i).closest("li")!;
    expect(rapid.textContent).toContain("0");
    expect(rapid.textContent).not.toContain("%");

    // Per side present.
    const side = screen.getByRole("list", { name: /côté|side/i });
    expect(within(side).getByText(/blancs/i)).toBeTruthy();
    expect(within(side).getByText(/noirs/i)).toBeTruthy();
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
    render(<StatsPage />);

    expect(await screen.findByText(/aucune partie importée/i)).toBeTruthy();
    // No breakdown tables in the empty state.
    expect(screen.queryByRole("list", { name: /cadence/i })).toBeNull();
    expect(screen.queryByLabelText(/^total$/i)).toBeNull();
  });
});
