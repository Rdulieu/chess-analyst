import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeyMomentReadout } from "../src/features/confrontation/KeyMomentReadout";
import type { KeyMomentReading } from "../src/types";

function reading(over: Partial<KeyMomentReading> = {}): KeyMomentReading {
  return { marked: 1, damageFound: 24, damageTotal: 42, drift: 0.9, misses: [], ...over };
}

describe("Where I looked — the Key moment reading", () => {
  it("shows the share with its numerator and denominator, not the rate alone", () => {
    render(<KeyMomentReadout keyMoments={reading()} />);

    const figure = screen.getByRole("group", { name: /où j'ai regardé|dégâts/i });
    expect(figure.textContent).toMatch(/57 %/);
    // The currency travels: the Player must be able to check the division.
    expect(figure.textContent).toMatch(/24/);
    expect(figure.textContent).toMatch(/42/);
  });

  it("says 'no score' rather than 0 % on a Game the Player never faulted", () => {
    render(<KeyMomentReadout keyMoments={reading({ damageFound: 0, damageTotal: 0, drift: 31 })} />);

    const figure = screen.getByRole("group", { name: /où j'ai regardé|dégâts/i });
    expect(figure.textContent).toMatch(/pas de score|pas de chiffre/i);
    // `\b` matters: the Drift note says "placerait 100 % hors d'atteinte", and a
    // loose /0 %/ matches the tail of "100 %".
    expect(figure.textContent).not.toMatch(/\b0 %/);
    // And it says WHY, which is the lesson: there was no fault to find.
    expect(figure.textContent).toMatch(/pas de faute|aucune faute|rien à trouver/i);
  });

  it("reports the Drift beside the figure and says it is not in the division", () => {
    render(<KeyMomentReadout keyMoments={reading({ drift: 18 })} />);

    const drift = document.querySelector('[data-part="drift"]');
    expect(drift?.textContent).toMatch(/18/);
    // Out of the denominator, because Drift has no Move to point at: counting it
    // would put 100% beyond the reach of a perfect reading.
    expect(drift?.textContent).toMatch(/aucun coup à désigner|pas dans|hors/i);
  });

  it("shows the distance of a marker that found nothing, naming both Moves", () => {
    render(
      <KeyMomentReadout
        keyMoments={reading({
          misses: [
            { ply: 41, notation: "Rd1", lostThere: 0, nearest: { ply: 43, lost: 24, notation: "Nxe5" } },
          ],
        })}
      />,
    );

    const miss = document.querySelector('[data-part="miss"]');
    // "your marker is on 21.Rd1, which cost nothing — the loss is on 22.Nxe5,
    // one Move later". Both Moves named, and the gap stated.
    expect(miss?.textContent).toMatch(/21\.Rd1/);
    expect(miss?.textContent).toMatch(/22\.Nxe5/);
    expect(miss?.textContent).toMatch(/n'a rien coûté|rien coûté/i);
  });

  it("does not invent a nearest Move when the Player had no fault at all", () => {
    render(
      <KeyMomentReadout
        keyMoments={reading({
          damageTotal: 0,
          misses: [{ ply: 41, notation: "Rd1", lostThere: 0, nearest: null }],
        })}
      />,
    );

    const miss = document.querySelector('[data-part="miss"]');
    expect(miss?.textContent).toMatch(/aucune faute|il n'y en avait pas|rien à désigner/i);
  });

  it("shows nothing at all when the Player posed no Key moment", () => {
    const { container } = render(<KeyMomentReadout keyMoments={reading({ marked: 0 })} />);

    expect(container.textContent).toBe("");
  });

  it("tells two plies of the SAME Move number apart", () => {
    // "21." and "21…" are nearly the same string for two different Moves. With
    // the notation they are two Moves the Player can find on their board.
    render(
      <KeyMomentReadout
        keyMoments={reading({
          misses: [
            { ply: 41, notation: "Rd1", lostThere: 0, nearest: { ply: 42, lost: 24, notation: "Nxe5" } },
          ],
        })}
      />,
    );

    const miss = document.querySelector('[data-part="miss"]');
    expect(miss?.textContent).toMatch(/21\.Rd1/);
    expect(miss?.textContent).toMatch(/21…Nxe5/);
  });

  it("falls back to the Move number when no notation came through", () => {
    render(
      <KeyMomentReadout
        keyMoments={reading({
          misses: [{ ply: 41, notation: null, lostThere: 0, nearest: null }],
        })}
      />,
    );

    // A poorer sentence, and still a true one: no figure depends on the PGN.
    expect(document.querySelector('[data-part="miss"]')?.textContent).toMatch(/21\./);
  });

  it("agrees in number when a single Key moment was posed", () => {
    render(<KeyMomentReadout keyMoments={reading({ marked: 1 })} />);

    const figure = screen.getByRole("group", { name: /où j'ai regardé/i });
    expect(figure.textContent).toMatch(/votre moment clé est confronté/i);
    expect(figure.textContent).not.toMatch(/vos moment clé/i);
  });

  it("leaves no markdown in the prose the Player reads", () => {
    const { container } = render(<KeyMomentReadout keyMoments={reading({ drift: 18 })} />);

    // Backticks in a template string reach the screen verbatim: what reads as
    // emphasis in source is literal punctuation on the page.
    expect(container.textContent).not.toMatch(/[`*_]/);
  });
});
