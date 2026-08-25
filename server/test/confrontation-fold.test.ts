import { describe, it, expect } from "vitest";
import {
  confrontGame,
  foldConfrontations,
  ConfrontationRefusal,
  type GameConfrontation,
} from "../src/personal/confrontation";
import { gameAnnotations, type StoredEvaluation } from "../src/analysis/derivation";
import { gameRecap } from "../src/analysis/recap";
import { gamePositions } from "../src/chess/positions";
import type { GameAnnotations } from "../src/annotations/repository";
import type { PersonalAnalysis, PersonalMark } from "../src/personal/repository";

const PGN = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 d6";
const REGIME = { depth: 16, lines: 2 };

function annotationsOf(cps: number[]): GameAnnotations {
  const fens = gamePositions(PGN);
  const evals: StoredEvaluation[] = cps.map((cp, ply) => ({
    ply,
    fen: fens[ply],
    cp,
    mate: null,
    pv: "",
  }));
  const game = { playerColor: "white" as const };
  return {
    analyzed: true,
    plies: gameAnnotations({ ...game, id: 1 } as never, evals),
    regime: REGIME,
    recap: gameRecap(game, evals, REGIME),
  };
}

function sealed(
  gameId: number,
  marks: Partial<PersonalMark>[],
  engineSeen = false,
): PersonalAnalysis {
  return {
    gameId,
    sealedAt: "2026-08-25T10:00:00.000Z",
    engineSeenBeforeSeal: engineSeen,
    marks: marks.map((m) => ({
      ply: 0,
      declaredSeverity: null,
      note: null,
      keyMoment: false,
      posterior: false,
      ...m,
    })),
  };
}

function confronted(...args: Parameters<typeof confrontGame>): GameConfrontation {
  const result = confrontGame(...args);
  if (result instanceof ConfrontationRefusal) throw new Error(`refused: ${result.reason}`);
  return result;
}

/** Two Games read differently — enough for a fold to be more than a copy. */
const QUIET = [0, 0, 0, 0, 0, 0, 0, 0, 0];
const TWO_FAULTS = [30, -20, 10, 200, -190, 620, -600, 590, -580];

describe("foldConfrontations — the aggregate IS the sum", () => {
  it("reconciles with the Games it covers, figure by figure", () => {
    // Not a test we hope passes: ADR-0017 makes this the DEFINITION. The Player
    // must be able to open one Game they know and see how the global figure was
    // arrived at, and that only holds if there is ONE implementation.
    const games = [
      confronted(sealed(1, [{ ply: 1, declaredSeverity: "sound" }]), annotationsOf(QUIET)),
      confronted(
        sealed(2, [
          { ply: 3, declaredSeverity: "inaccuracy" },
          { ply: 5, keyMoment: true },
        ]),
        annotationsOf(TWO_FAULTS),
      ),
    ];

    const summary = foldConfrontations(games);

    for (const field of ["countedMoves", "examined", "scorable", "agreed"] as const) {
      expect(summary.severity[field]).toBe(
        games.reduce((sum, g) => sum + g.severity[field], 0),
      );
    }
    for (const field of ["marked", "damageFound", "damageTotal", "drift"] as const) {
      expect(summary.keyMoments[field]).toBeCloseTo(
        games.reduce((sum, g) => sum + g.keyMoments[field], 0),
        10,
      );
    }
  });

  it("sums numerators over sums of denominators — never averages the rates", () => {
    // A reading of three Moves must not weigh as much as one of sixty.
    const small = confronted(sealed(1, [{ ply: 1, declaredSeverity: "sound" }]), annotationsOf(QUIET));
    const wrong = confronted(
      sealed(2, [{ ply: 3, declaredSeverity: "blunder" }]),
      annotationsOf(TWO_FAULTS),
    );

    const summary = foldConfrontations([small, wrong]);

    // One right out of two scorable — not the mean of 100% and 0%, which would
    // happen to agree here and would not on unequal samples.
    expect(summary.severity.scorable).toBe(2);
    expect(summary.severity.agreed).toBe(1);
    // And no share is served at all: the division belongs where it is read.
    expect(summary.severity).not.toHaveProperty("share");
  });

  it("folds the matrix whole, so the bias reads at the corpus scale too", () => {
    const games = [
      confronted(sealed(1, [{ ply: 1, declaredSeverity: "sound" }]), annotationsOf(QUIET)),
      confronted(sealed(2, [{ ply: 1, declaredSeverity: "sound" }]), annotationsOf(QUIET)),
    ];

    const summary = foldConfrontations(games);

    expect(summary.severity.matrix.sound.none).toBe(2);
  });

  it("counts the readings it rests on — three readings are not a tendency", () => {
    const games = [
      confronted(sealed(1, [{ ply: 1, declaredSeverity: "sound" }]), annotationsOf(QUIET)),
      confronted(sealed(2, [{ ply: 1, declaredSeverity: "sound" }]), annotationsOf(QUIET), []),
    ];

    expect(foldConfrontations(games).readings).toBe(2);
  });

  it("counts provenance without cutting the figures by it", () => {
    const games = [
      confronted(sealed(1, [{ ply: 1, declaredSeverity: "sound" }], false), annotationsOf(QUIET)),
      confronted(sealed(2, [{ ply: 1, declaredSeverity: "sound" }], true), annotationsOf(QUIET)),
      confronted(sealed(3, [{ ply: 1, declaredSeverity: "sound" }], true), annotationsOf(QUIET)),
    ];

    const summary = foldConfrontations(games);

    // Counted, so the reader knows what the figures are worth. NOT used to slice
    // them: two sets of three figures on a sample this size would say less than
    // the counts beside one set.
    expect(summary.provenance).toEqual({ unaided: 1, informed: 2 });
    expect(summary.severity.scorable).toBe(3);
  });

  it("folds nothing into an empty summary rather than into zeros that lie", () => {
    const summary = foldConfrontations([]);

    expect(summary.readings).toBe(0);
    expect(summary.severity.countedMoves).toBe(0);
    // A Profile with no sealed reading has its own screen — the zero denominator
    // is what makes "no score" say so rather than printing 0%.
    expect(summary.keyMoments.damageTotal).toBe(0);
  });
});
