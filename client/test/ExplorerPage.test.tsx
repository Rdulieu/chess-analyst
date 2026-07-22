import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExplorerPage } from "../src/pages/ExplorerPage";

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

    const e4 = (await screen.findByRole("listitem")).textContent ?? "";
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
