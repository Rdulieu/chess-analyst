import { describe, it, expect } from "vitest";
import { PHASE_LABEL, phaseStarts } from "../src/chess/phase";
import type { MoveAnnotation } from "../src/types";

/** Annotations carrying nothing but the Phase — the only field this reads. */
const of = (...phases: MoveAnnotation["phase"][]): MoveAnnotation[] =>
  phases.map((phase, ply) => ({
    counted: null,
    chancesLost: null,
    ply,
    whiteEval: { cp: 0, mate: null },
    whiteWinChances: 50,
    severity: null,
    bestLine: [],
    phase,
  }));

describe("Phase — what the move list marks", () => {
  it("marks where each Phase begins, and never the first one: a Game starts somewhere", () => {
    const starts = phaseStarts(of("early", "early", "middlegame", "middlegame", "endgame"));

    expect(starts).toEqual([
      { ply: 2, phase: "middlegame" },
      { ply: 4, phase: "endgame" },
    ]);
  });

  it("marks nothing at all on a Game that never leaves the start", () => {
    expect(phaseStarts(of("early", "early", "early"))).toEqual([]);
  });

  it("never marks the same Phase twice — the derivation latches, so two marks is the ceiling", () => {
    const starts = phaseStarts(of("early", "middlegame", "endgame", "endgame", "endgame"));

    expect(starts).toHaveLength(2);
  });

  it("marks a Phase a Game jumps straight into, rather than the one it skipped", () => {
    // Nothing forbids a Game reaching the Endgame from the Early game.
    expect(phaseStarts(of("early", "endgame"))).toEqual([{ ply: 1, phase: "endgame" }]);
  });

  it("names every Phase in words, since the mark must be readable aloud", () => {
    expect(PHASE_LABEL.early).toBe("Début de partie");
    expect(PHASE_LABEL.middlegame).toBe("Milieu de partie");
    expect(PHASE_LABEL.endgame).toBe("Finale");
  });
});
