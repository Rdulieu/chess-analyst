import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PhaseDamageTable } from "../src/features/stats/PhaseDamageTable";
import { PhaseResultTable } from "../src/features/stats/PhaseResultTable";
import { phaseDisagreement } from "../src/features/stats/phaseReading";
import type { PhaseDamageTable as Damage, PhaseResultTable as Results } from "../src/types";

/** The requester's `DudulSmash` Profile, as measured on 2026-09-25. */
const RESULTS: Results = {
  rows: [
    { phase: "early", games: 6, win: 4, draw: 0, loss: 2, winRate: 4 / 6, share: 3 },
    { phase: "middlegame", games: 36, win: 23, draw: 1, loss: 12, winRate: 23.5 / 36, share: 19 },
    { phase: "endgame", games: 144, win: 69, draw: 1, loss: 74, winRate: 69.5 / 144, share: 78 },
  ],
  games: 186,
  filed: 186,
  unreadable: 0,
};

const DAMAGE: Damage = {
  rows: [
    { phase: "early", dominant: 21, reached: 66, meanShare: 0.348, medianShare: 0.251 },
    { phase: "middlegame", dominant: 33, reached: 63, meanShare: 0.506, medianShare: 0.478 },
    { phase: "endgame", dominant: 12, reached: 49, meanShare: 0.228, medianShare: 0.119 },
  ],
  analysed: 66,
  games: 186,
  undamaged: 0,
};

const showResults = (table: Partial<Results> = {}) =>
  render(<PhaseResultTable table={{ ...RESULTS, ...table }} />);
const showDamage = (table: Partial<Damage> = {}, results: Partial<Results> = {}) =>
  render(<PhaseDamageTable table={{ ...DAMAGE, ...table }} results={{ ...RESULTS, ...results }} />);

describe("PhaseResultTable — where the Games are decided", () => {
  it("gives each Phase its counts, its share AND its rate, never a bare rate", () => {
    showResults();
    const line = within(screen.getByRole("table", { name: /parties par phase de fin/i })).getByRole(
      "row",
      { name: /Finale/ },
    );
    expect(within(line).getByText("144 parties")).toBeTruthy();
    expect(within(line).getByText("78 %")).toBeTruthy();
    expect(within(line).getByLabelText("69 victoires, 1 nulles, 74 défaites")).toBeTruthy();
    expect(within(line).getByText("48 %")).toBeTruthy();
  });

  it("says its shares make a hundred, against the table it sits under", () => {
    showResults();
    const scope = screen.getByTestId("phase-results-scope").textContent ?? "";
    expect(scope).toContain("100 %");
    expect(scope).toContain("186");
    expect(scope).toMatch(/une seule/);
  });

  it("says in words that it shows a correlation and not a cause", () => {
    showResults();
    expect(screen.getByTestId("phase-results-caveat").textContent).toMatch(
      /corrélation, pas une cause/,
    );
  });

  it("leaves a Phase no Game ended in without a rate, rather than at zero", () => {
    showResults({
      rows: [
        { phase: "early", games: 0, win: 0, draw: 0, loss: 0, winRate: null, share: 0 },
        ...RESULTS.rows.slice(1),
      ],
    });
    const line = within(screen.getByRole("table", { name: /parties par phase de fin/i })).getByRole(
      "row",
      { name: /Début de partie/ },
    );
    // The share IS zero and says so; it is the WIN RATE — the last cell — that
    // must stay empty, because a rate over no Game is unsaid, not nil.
    const cells = within(line).getAllByRole("cell");
    expect(cells[1].textContent).toBe("0 %");
    expect(cells.at(-1)!.textContent).toBe("");
  });

  it("names a Game it could not replay, and only when there is one", () => {
    showResults();
    expect(screen.getByTestId("phase-results-scope").textContent).not.toMatch(/relue/);
    showResults({ unreadable: 2, filed: 184 });
    expect(screen.getAllByTestId("phase-results-scope")[1].textContent).toMatch(/2 parties.*relues|relue/);
  });

  it("scrolls the table and leaves the prose outside the scroller (380 px)", () => {
    const { container } = showResults();
    const scroller = container.querySelector('[data-scroll="x"]')!;
    expect(scroller.querySelector("table")).toBeTruthy();
    expect(scroller.querySelector("p")).toBeNull();
  });
});

describe("PhaseDamageTable — where the damage falls", () => {
  it("gives the count of dominant Games, its own denominator, and the mean WITH the median", () => {
    showDamage();
    const line = within(screen.getByRole("table", { name: /dégâts par phase/i })).getByRole("row", {
      name: /Finale/,
    });
    expect(within(line).getByText(/^12 \(18 %\)$/)).toBeTruthy();
    expect(within(line).getByText("49 parties")).toBeTruthy();
    expect(within(line).getByText("22.8 %")).toBeTruthy();
    expect(within(line).getByText("11.9 %")).toBeTruthy();
  });

  it("announces its denominator AND the whole history's, in the same breath", () => {
    showDamage();
    const scope = screen.getByTestId("phase-damage-scope").textContent ?? "";
    expect(scope).toMatch(/66 de vos 186 parties/);
    // It ages backwards: a count, never « your Games ».
    expect(scope).toMatch(/déplace ce dénominateur/);
  });

  it("says a phrase, never a table of zeroes, when nothing is analysed", () => {
    showDamage({ analysed: 0, games: 80, rows: DAMAGE.rows.map((r: Damage["rows"][number]) => ({ ...r, dominant: 0, reached: 0, meanShare: null, medianShare: null })) });
    expect(screen.queryByRole("table", { name: /dégâts par phase/i })).toBeNull();
    expect(screen.getByTestId("phase-damage-scope").textContent).toMatch(/Aucune de vos 80 parties/);
  });

  it("writes « non atteinte » rather than 0 % for a Phase no Game reached", () => {
    showDamage({
      rows: [
        ...DAMAGE.rows.slice(0, 2),
        { phase: "endgame", dominant: 0, reached: 0, meanShare: null, medianShare: null },
      ],
    });
    const line = within(screen.getByRole("table", { name: /dégâts par phase/i })).getByRole("row", {
      name: /Finale/,
    });
    expect(within(line).getAllByText("non atteinte")).toHaveLength(2);
    expect(within(line).queryByText("0.0 %")).toBeNull();
  });

  it("counts the analysed Games that lost nothing, rather than hiding them", () => {
    showDamage({ undamaged: 4 });
    expect(screen.getByTestId("phase-damage-scope").textContent).toMatch(/4 d'entre elles/);
  });

  it("states the two mitigations — the sample, and the per-row denominator", () => {
    showDamage();
    const caveat = screen.getByTestId("phase-damage-caveat").textContent ?? "";
    expect(caveat).toMatch(/analysées/);
    expect(caveat).toMatch(/ne compte pas dans le dénominateur de cette phase/);
    expect(caveat).toMatch(/médiane/);
  });

  it("names the disagreement between the two readings, as an observation", () => {
    showDamage();
    const line = screen.getByTestId("phase-disagreement").textContent ?? "";
    // With their articles: a label is not a phrase, and « désignent milieu de
    // partie » is not French — the FP of this slice read exactly that.
    expect(line).toMatch(/le milieu de partie/);
    expect(line).toMatch(/la finale/);
    expect(line).toMatch(/ni l'un ni l'autre ne dit pourquoi/i);
  });

  it("says nothing joint when the two readings agree", () => {
    showDamage({
      rows: [
        { phase: "early", dominant: 5, reached: 66, meanShare: 0.2, medianShare: 0.2 },
        { phase: "middlegame", dominant: 6, reached: 63, meanShare: 0.3, medianShare: 0.3 },
        { phase: "endgame", dominant: 55, reached: 49, meanShare: 0.5, medianShare: 0.5 },
      ],
    });
    expect(screen.queryByTestId("phase-disagreement")).toBeNull();
  });

  it("scrolls the table and leaves the prose outside the scroller (380 px)", () => {
    const { container } = showDamage();
    const scroller = container.querySelector('[data-scroll="x"]')!;
    expect(scroller.querySelector("table")).toBeTruthy();
    expect(scroller.querySelector("p")).toBeNull();
  });
});

describe("phaseDisagreement — the one thing said about both tables", () => {
  it("returns the two Phases when they differ, and nothing derived from both", () => {
    expect(phaseDisagreement(RESULTS, DAMAGE)).toEqual({ damage: "middlegame", result: "endgame" });
  });

  it("stays silent on a tie, which designates nothing", () => {
    const tied: Damage = {
      ...DAMAGE,
      rows: DAMAGE.rows.map((r: Damage["rows"][number]) => ({ ...r, dominant: 22 })),
    };
    expect(phaseDisagreement(RESULTS, tied)).toBeNull();
  });

  it("stays silent when nothing is analysed", () => {
    expect(
      phaseDisagreement(RESULTS, { ...DAMAGE, analysed: 0, rows: DAMAGE.rows.map((r: Damage["rows"][number]) => ({ ...r, dominant: 0 })) }),
    ).toBeNull();
  });

  it("does not read a Phase with no Game as the worst result", () => {
    const empty: Results = {
      ...RESULTS,
      rows: [
        { phase: "early", games: 0, win: 0, draw: 0, loss: 0, winRate: null, share: 0 },
        ...RESULTS.rows.slice(1),
      ],
    };
    expect(phaseDisagreement(empty, DAMAGE)).toEqual({ damage: "middlegame", result: "endgame" });
  });
});
