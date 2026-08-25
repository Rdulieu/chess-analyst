import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfrontationReadout } from "../src/features/confrontation/ConfrontationReadout";
import type { ConfusionMatrix, GameConfrontation } from "../src/types";

/** Seven agreements and three verdicts placed one band above the engine's. */
const MATRIX: ConfusionMatrix = {
  blunder: { blunder: 2, mistake: 3, inaccuracy: 0, none: 0 },
  mistake: { blunder: 0, mistake: 1, inaccuracy: 0, none: 0 },
  inaccuracy: { blunder: 0, mistake: 0, inaccuracy: 1, none: 0 },
  sound: { blunder: 0, mistake: 0, inaccuracy: 0, none: 3 },
  good: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
};

/** A confrontation of a Game whose reading covered half of what it is judged on. */
function confrontation(over: Partial<GameConfrontation> = {}): GameConfrontation {
  return {
    gameId: 1,
    sealedAt: "2026-08-25T10:00:00.000Z",
    provenance: "unaided",
    regime: { depth: 16, lines: 2 },
    severity: { countedMoves: 20, examined: 10, scorable: 10, agreed: 7, matrix: MATRIX },
    ...over,
  };
}

describe("Confrontation — coverage and accuracy, side by side", () => {
  it("reports the two figures separately, each with its count", () => {
    render(<ConfrontationReadout confrontation={confrontation()} />);

    // Coverage: half the Counted Moves were examined at all.
    const coverage = screen.getByRole("group", { name: /ce que j'ai examiné/i });
    expect(coverage.textContent).toMatch(/50 %/);
    expect(coverage.textContent).toMatch(/10 sur 20/);

    // Accuracy: over those, how justly. A different group, a different question.
    const accuracy = screen.getByRole("group", { name: /ce que j'ai vu juste/i });
    expect(accuracy.textContent).toMatch(/70 %/);
    expect(accuracy.textContent).toMatch(/7 sur 10/);
  });

  it("never fuses them into one figure", () => {
    render(<ConfrontationReadout confrontation={confrontation()} />);

    // A Player who annotates three Moves and judges them perfectly has 100%
    // accuracy and 15% coverage, and BOTH are true. Any single number here would
    // be optimisable, and the only way to optimise it is to imitate the engine.
    const sparse = confrontation({
      severity: {
        countedMoves: 20,
        examined: 3,
        scorable: 3,
        agreed: 3,
        matrix: { ...MATRIX, sound: { blunder: 0, mistake: 0, inaccuracy: 0, none: 3 }, blunder: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 }, mistake: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 }, inaccuracy: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 } },
      },
    });
    render(<ConfrontationReadout confrontation={sparse} />);

    expect(
      screen.getAllByRole("group", { name: /ce que j'ai vu juste/i })[1].textContent,
    ).toMatch(/100 %/);
    expect(
      screen.getAllByRole("group", { name: /ce que j'ai examiné/i })[1].textContent,
    ).toMatch(/15 %/);
  });

  it("says 'no figure' rather than 0 % when there was nothing to judge", () => {
    // A reading with no scorable verdict has not been wrong: it has said nothing
    // confrontable. A `0 %` would read as a failure where there was no attempt.
    render(
      <ConfrontationReadout
        confrontation={confrontation({
          severity: {
            countedMoves: 20,
            examined: 2,
            scorable: 0,
            agreed: 0,
            matrix: { ...MATRIX, blunder: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 }, mistake: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 }, inaccuracy: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 }, sound: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 }, good: { blunder: 0, mistake: 0, inaccuracy: 2, none: 0 } },
          },
        })}
      />,
    );

    const accuracy = screen.getByRole("group", { name: /ce que j'ai vu juste/i });
    expect(accuracy.textContent).toMatch(/pas de chiffre/i);
    expect(accuracy.textContent).not.toMatch(/0 %/);
  });

  it("shows no single score, under any name", () => {
    const { container } = render(<ConfrontationReadout confrontation={confrontation()} />);

    // Exactly two rates on this screen, and each belongs to a named question.
    // A third would be a composite, and a composite is optimisable by imitating
    // the engine — the one outcome this story exists against.
    const rates = (container.textContent ?? "").match(/\d+ %/g) ?? [];
    expect(rates).toHaveLength(2);
    expect(container.textContent).not.toMatch(/score|note globale|total/i);
  });

  it("never calls a disagreement an error", () => {
    const { container } = render(<ConfrontationReadout confrontation={confrontation()} />);

    // A disagreement says WHERE to look, never WHO is wrong: judging our own
    // analysis by Player/engine agreement would assume the Player right, which
    // is exactly what is not established.
    //
    // Read on the PROSE, not on the whole screen. `Erreur` is the name of a
    // severity band (US-16a's own vocabulary, shared with the engine on purpose),
    // and a matrix that shows that band has to print its name. What must never
    // appear is the word applied to a *divergence*.
    const prose = Array.from(container.querySelectorAll("p"))
      .map((p) => p.textContent)
      .join(" ");
    expect(prose).not.toMatch(/erreur/i);
    // What stands instead: a desaccord points somewhere, it does not convict.
    expect(prose).toMatch(/où regarder, pas qui se trompe/i);
  });
});

describe("Confrontation — how I get it wrong", () => {
  it("shows the five declared bands against the four measured ones, with counts", () => {
    render(<ConfrontationReadout confrontation={confrontation()} />);

    const table = screen.getByRole("table", { name: /mes verdicts.*moteur|matrice/i });
    // Four measured columns: "nothing flagged" is a fact, and it is the column
    // that makes a `Sound` verdict scorable at all.
    expect(screen.getAllByRole("columnheader")).toHaveLength(5); // 4 + the row corner
    expect(screen.getAllByRole("rowheader")).toHaveLength(5);
    // Every cell carries a COUNT, not merely an intensity.
    expect(table.textContent).toMatch(/3/);
  });

  it("lets the Player add up the scorable cells and land on the accuracy denominator", () => {
    render(<ConfrontationReadout confrontation={confrontation()} />);

    const scorable = screen
      .getAllByRole("row")
      .filter((row) => row.getAttribute("data-scored") === "true")
      .flatMap((row) => Array.from(row.querySelectorAll("[data-count]")))
      .map((cell) => Number(cell.textContent))
      .reduce((a, b) => a + b, 0);

    // 10 — the very figure printed beside the matrix.
    expect(scorable).toBe(10);
  });

  it("marks the agreements without relying on colour alone", () => {
    const { container } = render(<ConfrontationReadout confrontation={confrontation()} />);

    // A matrix is exactly the kind of table where a colour ramp quietly replaces
    // the information. The diagonal has to be readable without it.
    const agreements = container.querySelectorAll('[data-cell][data-agreement="true"]');
    expect(agreements).toHaveLength(4); // one per declared band that can agree
    agreements.forEach((cell) => {
      expect(cell.getAttribute("aria-label")).toMatch(/accord/i);
    });
  });

  it("states the direction of the bias, and it can be checked on the cells shown", () => {
    render(<ConfrontationReadout confrontation={confrontation()} />);

    // Three verdicts placed one band above the engine's, none below.
    const bias = document.querySelector('[data-part="bias"]');
    expect(bias?.textContent).toMatch(/sur-?évalu/i);
    expect(bias?.textContent).toMatch(/3/);
  });

  it("asserts no tendency the matrix does not support", () => {
    // One divergence is not a tendency. A confident sentence drawn from a single
    // cell would be worse than silence.
    render(
      <ConfrontationReadout
        confrontation={confrontation({
          severity: {
            countedMoves: 20,
            examined: 2,
            scorable: 2,
            agreed: 1,
            matrix: {
              blunder: { blunder: 0, mistake: 1, inaccuracy: 0, none: 0 },
              mistake: { blunder: 0, mistake: 1, inaccuracy: 0, none: 0 },
              inaccuracy: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
              sound: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
              good: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
            },
          },
        })}
      />,
    );

    const bias = document.querySelector('[data-part="bias"]');
    expect(bias?.textContent).not.toMatch(/sur-?évalu|sous-?évalu|plus sévère|moins sévère/i);
    // And it SAYS there is nothing to conclude, rather than leaving a blank.
    expect(bias?.textContent).toMatch(/pas assez/i);
  });

  it("agrees in number with a denominator of one", () => {
    // "1 verdicts confrontables" reads as a rendering bug and undermines a
    // figure the Player is meant to check by hand.
    render(
      <ConfrontationReadout
        confrontation={confrontation({
          severity: {
            countedMoves: 1,
            examined: 1,
            scorable: 1,
            agreed: 0,
            matrix: MATRIX,
          },
        })}
      />,
    );

    const accuracy = screen.getByRole("group", { name: /ce que j'ai vu juste/i });
    expect(accuracy.textContent).toMatch(/1 verdict confrontable/);
    expect(accuracy.textContent).not.toMatch(/1 verdicts/);
    const coverage = screen.getByRole("group", { name: /ce que j'ai examiné/i });
    expect(coverage.textContent).toMatch(/1 coup compté/);
    expect(coverage.textContent).not.toMatch(/1 coups/);
  });

  it("leaves no dangling separator on a cell that is not an agreement", () => {
    const { container } = render(<ConfrontationReadout confrontation={confrontation()} />);

    // Read aloud verbatim by a screen reader, so a trailing fragment is not
    // cosmetic there the way it is on screen.
    container.querySelectorAll("[data-cell]").forEach((cell) => {
      expect(cell.getAttribute("aria-label")).toBe(cell.getAttribute("aria-label")?.trim());
    });
  });
});
