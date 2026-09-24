import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SignatureTable } from "../src/features/stats/SignatureTable";
import type { SignatureTable as Table } from "../src/types";

const row = (signature: string, win: number, draw: number, loss: number) => ({
  signature,
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
  scope: { games: 186, withEndgame: 144, withoutEndgame: 42 },
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
    show({ rows: [], below: { configurations: 0 }, scope: { games: 5, withEndgame: 0, withoutEndgame: 5 } });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByTestId("signature-scope").textContent).toMatch(/aucune/i);
  });
});
