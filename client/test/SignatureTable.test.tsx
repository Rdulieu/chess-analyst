import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SignatureTable } from "../src/features/stats/SignatureTable";
import type { SignatureTable as Table } from "../src/types";

const DELTA: Record<string, number> = { "RR vs Q": 1, "R vs R": 0 };

const row = (signature: string, win: number, draw: number, loss: number) => ({
  signature,
  delta: DELTA[signature] ?? 0,
  games: win + draw + loss,
  win,
  draw,
  loss,
  winRate: (win + 0.5 * draw) / (win + draw + loss),
});

const TABLE: Table = {
  threshold: 3,
  rows: [row("RR vs Q", 1, 0, 2), row("R vs R", 4, 2, 1)],
  below: { configurations: 12 },
  scope: { games: 186, withEndgame: 144, withoutEndgame: 42, unreadable: 0 },
};

function show(table: Partial<Table> = {}) {
  render(<SignatureTable table={{ ...TABLE, ...table }} />);
}

describe("SignatureTable", () => {
  it("gives each configuration its counts AND its rate, never a bare rate", () => {
    show();
    const line = within(screen.getByRole("table", { name: /configurations de finale/i })
      .querySelector("tbody")!)
      .getByRole("row", { name: /RR vs Q/ });

    expect(within(line).getByText("3 parties")).toBeTruthy();
    expect(within(line).getByLabelText("1 victoires, 0 nulles, 2 défaites")).toBeTruthy();
    expect(within(line).getByText("33 %")).toBeTruthy();
  });

  it("announces its scope — how many Games it covers, and how many never reach an Endgame", () => {
    show();
    const scope = screen.getByTestId("signature-scope").textContent ?? "";
    expect(scope).toContain("144");
    expect(scope).toContain("186");
    expect(scope).toContain("42");
    expect(scope).toContain("23 %");
  });

  it("counts and names what fell under the bar, rather than erasing it", () => {
    show();
    expect(screen.getByTestId("signature-below").textContent).toMatch(/12 configurations.*3 parties/);
  });

  it("names a Game it could not replay apart, never as one without an Endgame", () => {
    show({ scope: { games: 186, withEndgame: 144, withoutEndgame: 41, unreadable: 1 } });
    expect(screen.getByTestId("signature-scope").textContent).toMatch(/n'a pas pu être relue/);
  });

  it("says nothing about unreadable Games when there are none", () => {
    show();
    expect(screen.getByTestId("signature-scope").textContent).not.toMatch(/relue/);
  });

  it("says nothing was relegated rather than printing a zero", () => {
    show({ below: { configurations: 0 } });
    expect(screen.queryByTestId("signature-below")).toBeNull();
  });

  it("keeps the order it was served — the table is sorted server-side", () => {
    show();
    const names = screen
      .getAllByRole("rowheader")
      .map((cell) => cell.textContent);
    expect(names).toEqual(["RR vs Q", "R vs R"]);
  });

  it("shows no table at all when no Game of the history reaches an Endgame", () => {
    show({ rows: [], below: { configurations: 0 }, scope: { games: 5, withEndgame: 0, withoutEndgame: 5, unreadable: 0 } });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByTestId("signature-scope").textContent).toMatch(/aucune/i);
  });
});

describe("SignatureTable — the material disagreement, as a column (US-32)", () => {
  it("shows the founding case at +1, signed, beside its signature", () => {
    show();
    const line = within(
      screen.getByRole("table", { name: /configurations de finale/i }).querySelector("tbody")!,
    ).getByRole("row", { name: /RR vs Q/ });
    expect(within(line).getByText("+1")).toBeTruthy();
  });

  it("writes an equal configuration 0 — a value, not an absence", () => {
    show();
    const line = within(
      screen.getByRole("table", { name: /configurations de finale/i }).querySelector("tbody")!,
    ).getByRole("row", { name: /R vs R/ });
    expect(within(line).getByText("0")).toBeTruthy();
  });

  it("writes the scale on the screen, since a +1 cannot be read without it", () => {
    show();
    expect(screen.getByTestId("signature-scale").textContent).toMatch(/9.*5.*3.*3/s);
  });

  it("does not reorder the table: the server's order is kept as served", () => {
    // `R vs R` is 0 and `RR vs Q` is +1; the column sorts nothing.
    show();
    const headers = screen
      .getAllByRole("rowheader")
      .map((h) => h.textContent);
    expect(headers).toEqual(["RR vs Q", "R vs R"]);
  });
});
