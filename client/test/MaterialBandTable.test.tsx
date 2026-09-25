import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MaterialBandTable } from "../src/features/stats/MaterialBandTable";
import type { MaterialBandTable as Table } from "../src/types";

const band = (
  label: string,
  win: number,
  draw: number,
  loss: number,
  spread: Table["rows"][number]["spread"] = null,
) => ({
  band: label,
  games: win + draw + loss,
  win,
  draw,
  loss,
  winRate: win + draw + loss === 0 ? null : (win + 0.5 * draw) / (win + draw + loss),
  spread,
});

const TABLE: Table = {
  rows: [
    band("≤ −9", 13, 0, 68),
    band("−8..−6", 13, 0, 36),
    band("−5..−3", 36, 2, 77),
    band("−2..+2", 114, 4, 109, { configurations: 26, lowest: 0, highest: 0.83 }),
    band("+3..+5", 60, 1, 30),
    band("+6..+8", 22, 0, 8),
    band("≥ +9", 0, 0, 0),
  ],
  couples: 638,
  threshold: 3,
  equalBand: "−2..+2",
};

function show(table: Partial<Table> = {}) {
  render(<MaterialBandTable table={{ ...TABLE, ...table }} />);
}

describe("MaterialBandTable — the win rate by band of material (US-32)", () => {
  it("gives each band its counts AND its rate, never a bare rate", () => {
    show();
    const line = within(
      screen.getByRole("table", { name: /win rate par bande/i }).querySelector("tbody")!,
    ).getByRole("row", { name: /−2\.\.\+2/ });

    expect(within(line).getByText("227")).toBeTruthy();
    expect(within(line).getByLabelText("114 victoires, 4 nulles, 109 défaites")).toBeTruthy();
    expect(within(line).getByText("51 %")).toBeTruthy();
  });

  it("says its unit is the couple, and that a Game counts in several bands", () => {
    show();
    const scope = screen.getByTestId("material-bands-scope").textContent ?? "";
    expect(scope).toContain("638");
    expect(scope).toMatch(/couple/i);
    expect(scope).toMatch(/plusieurs bandes|pas un nombre de parties/i);
  });

  it("writes the mitigation: inside the equal band the rate spreads wide", () => {
    show();
    const caveat = screen.getByTestId("material-bands-spread").textContent ?? "";
    expect(caveat).toContain("−2..+2");
    expect(caveat).toContain("26");
    expect(caveat).toContain("0 %");
    expect(caveat).toContain("83 %");
    expect(caveat).toMatch(/ne prédit pas|situe/);
  });

  it("stays silent on a spread it has not measured, rather than inventing one", () => {
    show({
      rows: TABLE.rows.map((r) => ({ ...r, spread: null })),
    });
    expect(screen.queryByTestId("material-bands-spread")).toBeNull();
  });

  it("leaves an empty band without a rate, rather than printing 0 %", () => {
    show();
    const line = within(
      screen.getByRole("table", { name: /win rate par bande/i }).querySelector("tbody")!,
    ).getByRole("row", { name: /≥ \+9/ });
    expect(line.textContent).not.toMatch(/%/);
  });

  it("shows nothing at all when not one couple was filed", () => {
    const { container } = render(
      <MaterialBandTable
        table={{ ...TABLE, couples: 0, rows: TABLE.rows.map((r: Table["rows"][number]) => band(r.band, 0, 0, 0)) }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("keeps its table inside a horizontal scroller, the prose outside", () => {
    show();
    const scroller = document.querySelector('[data-scroll="x"]');
    expect(scroller?.querySelector("table")).toBeTruthy();
    expect(scroller?.contains(screen.getByTestId("material-bands-scope"))).toBe(false);
  });
});
