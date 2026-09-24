import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PhaseDamageReadout } from "../src/features/analysis/PhaseDamageReadout";
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
