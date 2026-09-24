import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  PhaseDamageReadout,
  printedBands,
  printedSignatures,
} from "../src/features/analysis/PhaseDamageReadout";
import type { GameRecap } from "../src/types";

/** A recap whose three Phases were all reached, with the damage deliberately
 *  spread: the Early game only bled, the Middlegame dropped a piece, the
 *  Endgame did both. FABRICATED fixture. */
const SPREAD: GameRecap = {
  playerMoves: 40,
  countedMoves: 38,
  excluded: { forced: 1, decided: 1 },
  flaggedMoves: 4,
  countedErrors: 4,
  flaggedUncounted: { forced: 0, decided: 0 },
  chancesLost: 60,
  flaggedLoss: 45,
  drift: 15,
  opportunities: { total: 3, bySeverity: { inaccuracy: 1, mistake: 1, blunder: 1 } },
  byPhase: {
    early: {
      chancesLost: 8,
      flaggedLoss: 0,
      drift: 8,
      countedErrors: 0,
      opportunities: { total: 1, bySeverity: { inaccuracy: 1, mistake: 0, blunder: 0 } },
    },
    middlegame: {
      chancesLost: 22,
      flaggedLoss: 22,
      drift: 0,
      countedErrors: 1,
      opportunities: { total: 0, bySeverity: { inaccuracy: 0, mistake: 0, blunder: 0 } },
    },
    endgame: {
      chancesLost: 30,
      flaggedLoss: 23,
      drift: 7,
      countedErrors: 3,
      opportunities: { total: 2, bySeverity: { inaccuracy: 0, mistake: 1, blunder: 1 } },
    },
  },
  bySignature: [
    { signature: "RR vs Q", chancesLost: 23 },
    { signature: "RR vs —", chancesLost: 0 },
    { signature: "R vs —", chancesLost: 7 },
  ],
  regime: { depth: 16, lines: 2 },
};

/** The same Game, cut short: it never reaches the Endgame. 19 of the 78
 *  analysed Games are in this case. FABRICATED fixture. */
const NO_ENDGAME: GameRecap = {
  ...SPREAD,
  chancesLost: 30,
  flaggedLoss: 22,
  drift: 8,
  byPhase: { ...SPREAD.byPhase, endgame: null },
  bySignature: null,
};

const block = () => screen.getByRole("region", { name: /où cette partie s'est jouée/i });
const row = (name: RegExp) => within(block()).getByRole("row", { name });

/** Every figure of one row, as printed — the Player's own reading of the line. */
const cells = (name: RegExp) =>
  within(row(name))
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");

/** A printed « 12,3 % » back as a number, so the test adds what the SCREEN says
 *  and not what the payload held. That is the whole claim under test. */
const figure = (text: string) => Number(text.replace("%", "").replace(",", ".").trim());

describe("Where the Game was lost — the damage located by Phase", () => {
  it("gives each Phase its own line, named in words", () => {
    render(<PhaseDamageReadout recap={SPREAD} />);

    expect(row(/début de partie/i)).toBeTruthy();
    expect(row(/milieu de partie/i)).toBeTruthy();
    expect(row(/finale/i)).toBeTruthy();
  });

  it("adds up ON SCREEN to the total the recap already showed", () => {
    render(<PhaseDamageReadout recap={SPREAD} />);

    const lost = [/début de partie/i, /milieu de partie/i, /finale/i]
      .map((name) => figure(cells(name)[0]))
      .reduce((sum, value) => sum + value, 0);

    // The one claim the block invites the Player to check by hand.
    expect(lost).toBeCloseTo(SPREAD.chancesLost, 6);
  });

  it("separates what was DROPPED from what was BLED, rather than one total per Phase", () => {
    render(<PhaseDamageReadout recap={SPREAD} />);

    // The Early game only bled; the Middlegame only dropped.
    const early = cells(/début de partie/i);
    expect(figure(early[1])).toBe(0);
    expect(figure(early[2])).toBe(8);

    const middle = cells(/milieu de partie/i);
    expect(figure(middle[1])).toBe(22);
    expect(figure(middle[2])).toBe(0);
  });

  it("holds `lâché + saigné = perdu` on every printed line", () => {
    render(<PhaseDamageReadout recap={SPREAD} />);

    for (const name of [/début de partie/i, /milieu de partie/i, /finale/i]) {
      const [lost, flagged, drift] = cells(name).map(figure);
      expect(flagged + drift).toBeCloseTo(lost, 6);
    }
  });

  it("spreads the counted errors the same way", () => {
    render(<PhaseDamageReadout recap={SPREAD} />);

    const errors = [/début de partie/i, /milieu de partie/i, /finale/i]
      .map((name) => Number(cells(name)[3]))
      .reduce((sum, value) => sum + value, 0);

    expect(errors).toBe(SPREAD.countedErrors);
  });

  it("keeps the opponent's Opportunities in a column of their own, never in the Player's figures", () => {
    render(<PhaseDamageReadout recap={SPREAD} showOpportunities />);

    const endgame = row(/finale/i);
    const offered = within(endgame).getByText(/2\s*Opportunity/i);
    expect(offered).toBeTruthy();
    // And the Player's own damage on that same line is untouched by them.
    const [lost, flagged, drift, errors] = cells(/finale/i);
    expect(figure(lost)).toBe(30);
    expect(figure(flagged)).toBe(23);
    expect(figure(drift)).toBe(7);
    expect(Number(errors)).toBe(3);
  });

  it("says nothing at all about the opponent unless the caller asked", () => {
    render(<PhaseDamageReadout recap={SPREAD} />);

    expect(within(block()).queryByText(/Opportunity/i)).toBeNull();
  });

  it("NAMES a Phase the Game never reached, and never prints a zero there", () => {
    render(<PhaseDamageReadout recap={NO_ENDGAME} />);

    const endgame = row(/finale/i);
    expect(endgame.textContent).toMatch(/non atteinte/i);
    // The false strength this rule exists against: « 0,0 % de vos dégâts en
    // finale » on a Game that never had one.
    expect(endgame.textContent).not.toMatch(/0[.,]0/);
  });

  it("distinguishes a Phase crossed with no damage from one never reached", () => {
    const clean: GameRecap = {
      ...NO_ENDGAME,
      byPhase: {
        ...NO_ENDGAME.byPhase,
        endgame: {
          chancesLost: 0,
          flaggedLoss: 0,
          drift: 0,
          countedErrors: 0,
          opportunities: { total: 0, bySeverity: { inaccuracy: 0, mistake: 0, blunder: 0 } },
        },
      },
    };
    render(<PhaseDamageReadout recap={clean} />);

    const endgame = row(/finale/i);
    expect(endgame.textContent).not.toMatch(/non atteinte/i);
    expect(endgame.textContent).toMatch(/0[.,]0/);
  });

  it("still adds up on screen when the rounding of the bands does not", () => {
    // Three thirds of 10: rounded on their own they print 3,3 each and the
    // column lands on 9,9 — a tenth off the total stated just above, on the one
    // sum the Player is invited to make.
    const thirds: GameRecap = {
      ...SPREAD,
      chancesLost: 10,
      flaggedLoss: 0,
      drift: 10,
      byPhase: {
        early: { chancesLost: 10 / 3, flaggedLoss: 0, drift: 10 / 3, countedErrors: 0, opportunities: SPREAD.byPhase.middlegame!.opportunities },
        middlegame: { chancesLost: 10 / 3, flaggedLoss: 0, drift: 10 / 3, countedErrors: 0, opportunities: SPREAD.byPhase.middlegame!.opportunities },
        endgame: { chancesLost: 10 / 3, flaggedLoss: 0, drift: 10 / 3, countedErrors: 0, opportunities: SPREAD.byPhase.middlegame!.opportunities },
      },
    };
    render(<PhaseDamageReadout recap={thirds} />);

    const lost = [/début de partie/i, /milieu de partie/i, /finale/i]
      .map((name) => figure(cells(name)[0]))
      .reduce((sum, value) => sum + value, 0);

    expect(lost).toBeCloseTo(10, 6);
  });
});

/**
 * The printing seam on its own (ADR-0027). It is declared, so it is driven
 * directly: what it decides — which band absorbs a rounding residual — is
 * invisible through the component on every Game but the one where it goes
 * wrong, and that is the Game worth pinning.
 */
describe("printedBands — figures that add up on screen", () => {
  it("makes each column land on the total the recap states", () => {
    const thirds: GameRecap = {
      ...SPREAD,
      chancesLost: 10,
      flaggedLoss: 4,
      drift: 6,
      byPhase: {
        early: { ...SPREAD.byPhase.early!, chancesLost: 10 / 3, flaggedLoss: 4 / 3, drift: 2 },
        middlegame: { ...SPREAD.byPhase.middlegame!, chancesLost: 10 / 3, flaggedLoss: 4 / 3, drift: 2 },
        endgame: { ...SPREAD.byPhase.endgame!, chancesLost: 10 / 3, flaggedLoss: 4 / 3, drift: 2 },
      },
    };

    const bands = printedBands(thirds);
    const sum = (read: (band: (typeof bands)[number]) => number) =>
      bands.reduce((total, printed) => total + read(printed), 0);

    expect(sum((band) => band.chancesLost)).toBeCloseTo(10, 6);
    expect(sum((band) => band.flaggedLoss)).toBeCloseTo(4, 6);
    expect(sum((band) => band.drift)).toBeCloseTo(6, 6);
  });

  it("never prints a NEGATIVE share on a Phase that only bled", () => {
    // The regression this seam was split out for. The heaviest Phase by
    // `chancesLost` is the Endgame, which dropped nothing at all; handing IT the
    // flagged column's residual printed « -0,1 % » under *lâchées* and a drift
    // larger than the loss — on exactly the Phase the split exists to describe.
    const bleeding: GameRecap = {
      ...SPREAD,
      chancesLost: 10.7,
      flaggedLoss: 0.7,
      drift: 10,
      byPhase: {
        early: { ...SPREAD.byPhase.early!, chancesLost: 0.35, flaggedLoss: 0.35, drift: 0 },
        middlegame: { ...SPREAD.byPhase.middlegame!, chancesLost: 0.35, flaggedLoss: 0.35, drift: 0 },
        endgame: { ...SPREAD.byPhase.endgame!, chancesLost: 10, flaggedLoss: 0, drift: 10 },
      },
    };

    const bands = printedBands(bleeding);

    for (const band of bands) {
      expect(band.chancesLost).toBeGreaterThanOrEqual(0);
      expect(band.flaggedLoss).toBeGreaterThanOrEqual(0);
      expect(band.drift).toBeGreaterThanOrEqual(0);
      expect(band.flaggedLoss + band.drift).toBeCloseTo(band.chancesLost, 6);
    }
    // And the columns still add up, which is the whole reason a residual moves.
    expect(bands.reduce((sum, band) => sum + band.flaggedLoss, 0)).toBeCloseTo(0.7, 6);
    expect(bands.reduce((sum, band) => sum + band.chancesLost, 0)).toBeCloseTo(10.7, 6);
  });

  it("leaves out a Phase the Game never reached, rather than printing it at zero", () => {
    expect(printedBands(NO_ENDGAME).map((band) => band.phase)).toEqual(["early", "middlegame"]);
  });
});

describe("In WHICH configuration — the damage located by Material signature", () => {
  it("lists the Endgame configurations the Game crossed, in the same block as the Phases", () => {
    render(<PhaseDamageReadout recap={SPREAD} />);

    // The same block (spec §5): one section, two tables — nothing new stacks
    // under the board that was not already there (ADR-0021).
    expect(within(block()).getByRole("row", { name: /^RR vs Q/ })).toBeTruthy();
    expect(within(block()).getByRole("row", { name: /^RR vs —/ })).toBeTruthy();
    expect(within(block()).getByRole("row", { name: /^R vs —/ })).toBeTruthy();
  });

  it("names the configuration, never a balance of points", () => {
    // ADR-0036: `RR vs Q` is +1 on any points scale. A number here would say
    // « level » about the very configuration that lost Game 715.
    render(<PhaseDamageReadout recap={SPREAD} />);

    const worst = within(block()).getByRole("row", { name: /^RR vs Q/ });
    expect(worst.textContent).toContain("RR vs Q");
    expect(worst.textContent).not.toMatch(/[+−-]\s*1\b/);
  });

  it("adds up ON SCREEN to the Endgame line just above it", () => {
    render(<PhaseDamageReadout recap={SPREAD} />);

    const listed = ["RR vs Q", "RR vs —", "R vs —"]
      .map((name) => figure(within(within(block()).getByRole("row", { name: new RegExp(`^${name}`) })).getAllByRole("cell")[0].textContent ?? ""))
      .reduce((sum, value) => sum + value, 0);

    expect(listed).toBeCloseTo(figure(cells(/finale/i)[0]), 6);
  });

  it("keeps a configuration crossed cleanly on screen, at zero", () => {
    render(<PhaseDamageReadout recap={SPREAD} />);

    const clean = within(block()).getByRole("row", { name: /^RR vs —/ });
    expect(clean.textContent).toMatch(/0[.,]0/);
  });

  it("SAYS that a Game without an Endgame has no configuration, rather than showing an empty table", () => {
    render(<PhaseDamageReadout recap={NO_ENDGAME} />);

    expect(within(block()).getByText(/aucune configuration/i)).toBeTruthy();
    expect(within(block()).queryByRole("row", { name: / vs / })).toBeNull();
  });

  it("still adds up on screen when the rounding of the configurations does not", () => {
    // Three thirds again, one scale down: the residual has to land somewhere or
    // the column misses the Endgame line by a tenth.
    const thirds: GameRecap = {
      ...SPREAD,
      bySignature: [
        { signature: "RR vs Q", chancesLost: 10 / 3 },
        { signature: "RR vs N", chancesLost: 10 / 3 },
        { signature: "R vs N", chancesLost: 10 / 3 },
      ],
      byPhase: { ...SPREAD.byPhase, endgame: { ...SPREAD.byPhase.endgame!, chancesLost: 10 } },
      chancesLost: 40,
    };
    render(<PhaseDamageReadout recap={thirds} />);

    const listed = ["RR vs Q", "RR vs N", "R vs N"]
      .map((name) => figure(within(within(block()).getByRole("row", { name: new RegExp(`^${name}`) })).getAllByRole("cell")[0].textContent ?? ""))
      .reduce((sum, value) => sum + value, 0);

    expect(listed).toBeCloseTo(figure(cells(/finale/i)[0]), 6);
  });
});

/**
 * The second printing seam (ADR-0027), driven directly for the same reason as
 * the first: which line absorbs a rounding residual is invisible through the
 * component on every Game but the one where it goes wrong.
 */
describe("printedSignatures — the residual lands where a tenth is least of the value", () => {
  it("never prints a NEGATIVE figure by handing a residual to a configuration at zero", () => {
    // The trap slice 02 hit one scale up: a line crossed cleanly must not print
    // « −0,1 % ». The heaviest line of the column carries the residual, and the
    // heaviest line is never the one at zero.
    const printed = printedSignatures(
      [
        { signature: "RR vs Q", chancesLost: 9.96 },
        { signature: "RR vs —", chancesLost: 0 },
        { signature: "R vs —", chancesLost: 0.02 },
      ],
      9.9,
    );

    expect(printed.every((line) => line.chancesLost >= 0)).toBe(true);
    expect(printed.find((line) => line.signature === "RR vs —")!.chancesLost).toBe(0);
  });

  it("lands the column on the figure the Endgame line prints, to the tenth", () => {
    const printed = printedSignatures(
      [
        { signature: "RR vs Q", chancesLost: 10 / 3 },
        { signature: "RR vs N", chancesLost: 10 / 3 },
        { signature: "R vs N", chancesLost: 10 / 3 },
      ],
      10,
    );

    expect(printed.reduce((sum, line) => sum + line.chancesLost, 0)).toBeCloseTo(10, 6);
  });

  it("stays at or above zero when MANY thin configurations round up together", () => {
    // The list is unbounded, unlike the three Phases: five lines at 0,06 each
    // print 0,1 and the column overshoots a 0,3 total by two tenths. A rule that
    // hands the whole residual to one line would print « −0,1 % » there — on a
    // thinly-bled Endgame crossing five configurations, which is ordinary.
    const printed = printedSignatures(
      [0.06, 0.06, 0.06, 0.06, 0.06].map((chancesLost, i) => ({ signature: `s${i}`, chancesLost })),
      0.3,
    );

    expect(printed.every((line) => line.chancesLost >= 0)).toBe(true);
    expect(printed.reduce((sum, line) => sum + line.chancesLost, 0)).toBeCloseTo(0.3, 6);
  });

  it("keeps the crossing order — the sequence is the reading, not a ranking", () => {
    const printed = printedSignatures(
      [
        { signature: "R vs —", chancesLost: 1 },
        { signature: "RR vs Q", chancesLost: 9 },
      ],
      10,
    );

    expect(printed.map((line) => line.signature)).toEqual(["R vs —", "RR vs Q"]);
  });
});
