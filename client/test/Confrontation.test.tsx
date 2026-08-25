import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfrontationReadout } from "../src/features/confrontation/ConfrontationReadout";
import type { GameConfrontation } from "../src/types";

/** A confrontation of a Game whose reading covered half of what it is judged on. */
function confrontation(over: Partial<GameConfrontation> = {}): GameConfrontation {
  return {
    gameId: 1,
    sealedAt: "2026-08-25T10:00:00.000Z",
    provenance: "unaided",
    regime: { depth: 16, lines: 2 },
    severity: { countedMoves: 20, examined: 10, scorable: 10, agreed: 7 },
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
      severity: { countedMoves: 20, examined: 3, scorable: 3, agreed: 3 },
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
          severity: { countedMoves: 20, examined: 2, scorable: 0, agreed: 0 },
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
    expect(container.textContent).not.toMatch(/erreur/i);
  });
});
