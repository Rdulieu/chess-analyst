import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameRecapReadout } from "../src/features/analysis/GameRecapReadout";
import type { GameRecap } from "../src/types";

const RECAP: GameRecap = {
  playerMoves: 30,
  countedMoves: 27,
  excluded: { forced: 1, decided: 2 },
  flaggedMoves: 4,
  countedErrors: 3,
  flaggedUncounted: { forced: 1, decided: 0 },
  chancesLost: 62.5,
  flaggedLoss: 48,
  drift: 14.5,
  regime: { depth: 16, lines: 2 },
};

const text = () => screen.getByRole("region", { name: /ce que cette partie apporte/i }).textContent!;

/** The sentence explaining the gap ALONE. The words "forcé" and "déjà décidée"
 *  also appear in the exclusions line just above, so asserting over the whole
 *  panel would pass whatever this sentence said. */
const gap = () =>
  screen.getByRole("region", { name: /ce que cette partie apporte/i }).querySelector('[data-part="gap"]')
    ?.textContent ?? "";

describe("The Game's recap — what it states", () => {
  it("states the counted Moves over the Player's total, so the denominator is visible", () => {
    render(<GameRecapReadout recap={RECAP} />);

    expect(text()).toMatch(/27\s*(\/|sur)\s*30/);
  });

  it("names the exclusions BY REASON, never as one lump", () => {
    render(<GameRecapReadout recap={RECAP} />);

    expect(text()).toMatch(/forcé/i);
    expect(text()).toMatch(/déjà décidée/i);
    expect(text()).toMatch(/\b1\b/);
    expect(text()).toMatch(/\b2\b/);
  });

  it("states the errors counted, everything lost, and the Drift", () => {
    render(<GameRecapReadout recap={RECAP} />);

    expect(text()).toMatch(/3/); // counted errors
    expect(text()).toMatch(/62[.,]5/); // chances lost
    expect(text()).toMatch(/14[.,]5/); // drift
  });

  it("EXPLAINS a gap between the errors shown and the errors counted, rather than leaving two figures to disagree", () => {
    render(<GameRecapReadout recap={RECAP} />);

    // Four flagged, three counted: the difference is the forced one.
    expect(text()).toMatch(/4/);
    expect(gap()).toMatch(/1 parce que le coup était forcé/i);
  });

  it("names the DECIDED reason when that is what the gap is made of, rather than asserting 'forcé'", () => {
    // The case this slice exists for. It cannot occur while the flagging band and
    // the denominator floor are the same number, and it starts occurring the
    // moment they part — at which point the hard-coded sentence would state, on
    // screen, something that is simply untrue of the Game in front of the Player.
    render(
      <GameRecapReadout
        recap={{ ...RECAP, flaggedUncounted: { forced: 0, decided: 2 } }}
      />,
    );

    expect(gap()).toMatch(/2 parce que les positions étaient déjà décidées/i);
    expect(gap()).not.toMatch(/forcé/i);
  });

  it("names BOTH reasons, each with its own count, when the gap is made of both", () => {
    render(
      <GameRecapReadout
        recap={{ ...RECAP, flaggedMoves: 6, flaggedUncounted: { forced: 1, decided: 2 } }}
      />,
    );

    // Never melted into one "non comptées": the two say different things, and a
    // Player who cannot tell them apart can audit neither.
    expect(gap()).toMatch(/1 parce que le coup était forcé/i);
    expect(gap()).toMatch(/2 parce que les positions étaient déjà décidées/i);
  });

  it("says nothing about a gap when there is none", () => {
    render(
      <GameRecapReadout
        recap={{
          ...RECAP,
          flaggedMoves: 3,
          countedErrors: 3,
          excluded: { forced: 0, decided: 2 },
          flaggedUncounted: { forced: 0, decided: 0 },
        }}
      />,
    );

    // No gap to explain, so no explanation — the sentence about a Move shown but
    // not counted is absent, not zeroed out.
    expect(text()).not.toMatch(/mais non comptée/i);
  });

  it("states the Search regime ONCE for the Game", () => {
    render(<GameRecapReadout recap={RECAP} />);

    expect(text()).toMatch(/profondeur 16/i);
    expect(text()).toMatch(/2 lignes/i);
  });

  it("says the regime is unknown rather than assuming today's", () => {
    render(<GameRecapReadout recap={{ ...RECAP, regime: null }} />);

    expect(text()).toMatch(/inconnu/i);
  });

  it("reads as zeros on a Game with nothing lost, with no special case", () => {
    render(
      <GameRecapReadout
        recap={{
          playerMoves: 12,
          countedMoves: 12,
          excluded: { forced: 0, decided: 0 },
          flaggedMoves: 0,
          flaggedUncounted: { forced: 0, decided: 0 },
          countedErrors: 0,
          chancesLost: 0,
          flaggedLoss: 0,
          drift: 0,
          regime: { depth: 16, lines: 2 },
        }}
      />,
    );

    expect(text()).toMatch(/12\s*(\/|sur)\s*12/);
    expect(text()).toMatch(/0/);
  });
});

describe("The Game's recap — the figures add up ON SCREEN", () => {
  it("shows a residual that is the difference of the figures shown, not a third rounding", () => {
    // Real values from Game 51: rounded independently they print 60.6 = 28.4 +
    // 32.3, which adds to 60.7. The model is exact; only the display lied — and
    // adding the two parts back is exactly what this panel invites.
    render(
      <GameRecapReadout
        recap={{
          ...RECAP,
          chancesLost: 60.610029825,
          flaggedLoss: 28.351291273,
          drift: 32.258738552,
        }}
      />,
    );

    const shown = text().match(/(\d+\.\d)\s*%/g)!.map((figure) => parseFloat(figure));
    const [total, flagged, drift] = shown;
    expect(flagged + drift).toBeCloseTo(total, 10);
  });

  it("prints every chances figure to the same precision", () => {
    render(<GameRecapReadout recap={{ ...RECAP, chancesLost: 191.2, flaggedLoss: 144, drift: 47.2 }} />);

    // "144 %" beside "47.2 %" reads as a different precision, not the same one.
    expect(text()).toContain("144.0 %");
  });
});
