import { describe, it, expect } from "vitest";
import { MATERIAL_BANDS, materialBandTable } from "../src/stats/material-bands";
import type { EndgameCrossing } from "../src/stats/signatures";

/**
 * FABRICATED fixtures, and named as such (US-32 spec, « réserve d'honnêteté ») —
 * the base's own Games are folded by `stats.test.ts`; what is pinned here is the
 * fold, which needs configurations that repeat a chosen number of times.
 */
const crossing = (result: "win" | "draw" | "loss", ...signatures: string[]): EndgameCrossing => ({
  result,
  signatures,
});

describe("materialBandTable — the win rate by band of material (US-32 slice 07)", () => {
  it("gives a row to each of the seven bands, poorest first, always", () => {
    const table = materialBandTable([], 3);
    expect(table.rows.map((r) => r.band)).toEqual(MATERIAL_BANDS.map((b) => b.label));
    expect(table.rows.map((r) => r.band)).toEqual([
      "≤ −9",
      "−8..−6",
      "−5..−3",
      "−2..+2",
      "+3..+5",
      "+6..+8",
      "≥ +9",
    ]);
  });

  it("files a couple (Game, configuration) under the band of its delta", () => {
    const table = materialBandTable([crossing("win", "RR vs Q", "Q vs —")], 3);
    // `RR vs Q` is +1 — the equal band — and `Q vs —` is +9.
    expect(table.rows[3]).toMatchObject({ band: "−2..+2", games: 1, win: 1 });
    expect(table.rows[6]).toMatchObject({ band: "≥ +9", games: 1, win: 1 });
  });

  it("counts couples and NOT Games: one Game crossing three bands counts thrice", () => {
    const table = materialBandTable([crossing("loss", "R vs R", "— vs R", "— vs Q")], 3);
    expect(table.couples).toBe(3);
    expect(table.rows.filter((r) => r.games > 0)).toHaveLength(3);
  });

  it("leaves an untouched band at zero with no rate, rather than at 0 %", () => {
    const table = materialBandTable([crossing("win", "R vs R")], 3);
    expect(table.rows[0]).toMatchObject({ games: 0, winRate: null });
  });

  it("carries the spread of the configurations INSIDE a band — the mitigation", () => {
    // Three configurations in the equal band: one always won, one always lost,
    // one in between. The band's own rate says 50 %; inside it, 0 % to 100 %.
    const table = materialBandTable(
      [
        ...Array.from({ length: 3 }, () => crossing("win", "R vs R")),
        ...Array.from({ length: 3 }, () => crossing("loss", "B vs B")),
        crossing("win", "N vs N"),
        crossing("loss", "N vs N"),
        crossing("loss", "N vs N"),
      ],
      3,
    );
    expect(table.rows[3].spread).toEqual({
      configurations: 3,
      lowest: 0,
      highest: 1,
    });
  });

  it("says nothing of a spread it cannot show: no configuration clears the bar", () => {
    const table = materialBandTable([crossing("win", "R vs R")], 3);
    expect(table.rows[3].spread).toBeNull();
  });

  it("reads the spread over the configurations at the bar only, band by band", () => {
    const table = materialBandTable(
      [
        ...Array.from({ length: 3 }, () => crossing("win", "R vs R")),
        // Seen twice: under the bar, so it is not part of the spread — its rate
        // would be the widest and the least worth believing.
        crossing("loss", "B vs B"),
        crossing("loss", "B vs B"),
      ],
      3,
    );
    expect(table.rows[3].spread).toEqual({ configurations: 1, lowest: 1, highest: 1 });
  });

  it("never groups, never sorts: the bands are an axis, the rows stay the table's", () => {
    // The table it accompanies is ordered by frequency and identified by the
    // signature (ADR-0036). This one adds a reading, and owns no row of it.
    const table = materialBandTable([crossing("win", "RR vs Q")], 3);
    expect(table.rows).toHaveLength(MATERIAL_BANDS.length);
  });
});

describe("materialBandTable — the band that holds equality", () => {
  it("names it, rather than leaving the page to match a label", () => {
    expect(materialBandTable([], 3).equalBand).toBe("−2..+2");
  });
});
