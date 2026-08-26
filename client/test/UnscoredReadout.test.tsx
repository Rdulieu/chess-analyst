import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UnscoredReadout } from "../src/features/confrontation/UnscoredReadout";
import type { GameConfrontation } from "../src/types";

const EMPTY_ROW = { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 };

function confrontation(over: Partial<GameConfrontation> = {}): GameConfrontation {
  return {
    gameId: 1,
    sealedAt: "2026-08-25T10:00:00.000Z",
    provenance: "unaided",
    regime: { depth: 16, lines: 2 },
    severity: {
      countedMoves: 20,
      examined: 10,
      scorable: 9,
      agreed: 7,
      matrix: {
        blunder: EMPTY_ROW,
        mistake: EMPTY_ROW,
        inaccuracy: EMPTY_ROW,
        sound: EMPTY_ROW,
        good: { ...EMPTY_ROW, none: 1 },
      },
      unscored: { good: 1, opponent: 2 },
    },
    keyMoments: { marked: 0, damageFound: 0, damageTotal: 0, drift: 0, misses: [] },
    uncounted: [
      { ply: 7, notation: "Nf3", reason: "forced", declared: "sound" },
      { ply: 41, notation: "Rd1", reason: "decided", declared: null },
      { ply: 43, notation: "Nxe5", reason: "decided", declared: "blunder" },
    ],
    posterior: [],
    ...over,
  };
}

describe("What the Confrontation shows without scoring it", () => {
  it("keeps the two exclusion reasons apart, each with its count", () => {
    render(<UnscoredReadout confrontation={confrontation()} />);

    // "Forced" and "already decided" say different things, and a Player who
    // cannot tell them apart can audit neither.
    const forced = screen.getByText(/forcé/i).closest("[data-uncounted]");
    expect(forced?.textContent).toMatch(/1/);
    const decided = screen.getByText(/déjà décidée|déjà décidé/i).closest("[data-uncounted]");
    expect(decided?.textContent).toMatch(/2/);
  });

  it("says why a Good is not scored, rather than dropping it silently", () => {
    render(<UnscoredReadout confrontation={confrontation()} />);

    const good = screen.getByText(/bon/i).closest("[data-unscored]");
    expect(good?.textContent).toMatch(/1/);
    // The reason, not just the exclusion: the engine has no band for merit.
    expect(good?.textContent).toMatch(/mérite|ne flague que|rien à opposer/i);
  });

  it("says the opponent's Moves are not scored BY DECISION, not for want of means", () => {
    render(<UnscoredReadout confrontation={confrontation()} />);

    const opponent = screen.getByText(/adversaire/i).closest("[data-unscored]");
    expect(opponent?.textContent).toMatch(/2/);
    expect(opponent?.textContent).toMatch(/votre|vos propres|progrès/i);
  });

  it("shows the verdict the Player put on a forced Move, and that it was not held against them", () => {
    render(<UnscoredReadout confrontation={confrontation()} />);

    // The case that settles the denominator: `Sound` on a forced catastrophe is
    // RIGHT, and a naive matrix would count it wrong.
    const forced = screen.getByText(/forcé/i).closest("[data-uncounted]");
    expect(forced?.textContent).toMatch(/correct/i);
    expect(forced?.textContent).toMatch(/pas noté|non noté|n'est pas compté/i);
  });

  it("shows nothing at all when there is nothing unscored to show", () => {
    const { container } = render(
      <UnscoredReadout
        confrontation={confrontation({
          uncounted: [],
          severity: {
            ...confrontation().severity,
            unscored: { good: 0, opponent: 0 },
          },
        })}
      />,
    );

    // An empty section headed "not scored" invites the Player to hunt for
    // something that is not there.
    expect(container.textContent).toBe("");
  });

  it("marks what was written after the seal as a layer of its own", () => {
    render(
      <UnscoredReadout
        confrontation={confrontation({
          posterior: [
            { ply: 5, notation: "Bc4", declaredSeverity: "blunder", note: null, keyMoment: false },
            {
              ply: 7,
              notation: "d3",
              declaredSeverity: null,
              note: "j'ai compris en voyant la ligne",
              keyMoment: false,
            },
          ],
        })}
      />,
    );

    const layer = document.querySelector('[data-part="posterior"]');
    expect(layer?.textContent).toMatch(/après le scellement|après avoir vu/i);
    expect(layer?.textContent).toMatch(/j'ai compris en voyant la ligne/);
    // And it is said to be outside the comparison, not merely placed elsewhere.
    expect(layer?.textContent).toMatch(/hors|n'entre dans|ne compte pas|jamais compt/i);
  });

  it("names the Moves it lists, like every other paragraph on the screen", () => {
    // The screen must name Moves everywhere or nowhere: naming one paragraph and
    // numbering the next reads as a rendering bug, because it is one.
    render(<UnscoredReadout confrontation={confrontation()} />);

    const forced = screen.getByText(/forcé/i).closest("[data-uncounted]");
    expect(forced?.textContent).toMatch(/4\.Nf3/);
  });

  it("falls back to the Move number when no notation came through", () => {
    render(
      <UnscoredReadout
        confrontation={confrontation({
          uncounted: [{ ply: 7, notation: null, reason: "forced", declared: null }],
        })}
      />,
    );

    const forced = screen.getByText(/forcé/i).closest("[data-uncounted]");
    expect(forced?.textContent).toMatch(/4\./);
  });
});
