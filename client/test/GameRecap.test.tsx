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
  chancesLost: 62.5,
  flaggedLoss: 48,
  drift: 14.5,
  regime: { depth: 16, lines: 2 },
};

const text = () => screen.getByRole("region", { name: /ce que cette partie apporte/i }).textContent!;

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
    expect(text()).toMatch(/forcé/i);
  });

  it("says nothing about a gap when there is none", () => {
    render(<GameRecapReadout recap={{ ...RECAP, flaggedMoves: 3, countedErrors: 3, excluded: { forced: 0, decided: 2 } }} />);

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
