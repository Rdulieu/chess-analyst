import { describe, it, expect } from "vitest";
import { confrontGame, ConfrontationRefusal } from "../src/personal/confrontation";
import { gameAnnotations } from "../src/analysis/derivation";
import { gameRecap } from "../src/analysis/recap";
import { gameNotations } from "../src/chess/positions";
import type { GameAnnotations } from "../src/annotations/repository";
import {
  realReading,
  realReadingEvaluations,
  REAL_READING_COLOR,
  REAL_READING_PGN,
} from "./fixtures/real-reading";

/**
 * The `Confrontation` of a **real** reading of a **real** analysed Game — the
 * Player's own, sealed before the engine was ever shown (see the fixture).
 *
 * Every other test here argues one rule at a time on Positions built to make that
 * rule visible. This one asks a different question: **do the rules hold together
 * on something nobody designed?** A Game read by hand does not arrange itself into
 * neat cases, and the figures still have to agree with each other and with the
 * cells the Player can see.
 *
 * The engine side is **re-derived** from the stored scores by the production code,
 * never frozen: retuning a threshold moves these numbers, and that is correct
 * (ADR-0009). So the assertions are about **relationships** — sums, denominators,
 * what is counted and what is not — and about the handful of facts the Player's own
 * marks fix. Only the counts the reading itself pins are written literally.
 */
const REGIME = { depth: 16, lines: 2 };

function annotations(): GameAnnotations {
  const evals = realReadingEvaluations();
  const game = { playerColor: REAL_READING_COLOR };
  return {
    analyzed: true,
    plies: gameAnnotations({ ...game, id: 1 } as never, evals),
    regime: REGIME,
    recap: gameRecap(game, evals, REGIME),
  };
}

function confronted() {
  const result = confrontGame(realReading(), annotations(), gameNotations(REAL_READING_PGN));
  if (result instanceof ConfrontationRefusal) throw new Error(`refused: ${result.reason}`);
  return result;
}

describe("Confrontation — a real reading of a real Game", () => {
  it("holds the Player to what the analysis counts, not to everything they played", () => {
    const { recap } = annotations();

    // The case ADR-0017 is about, and here it is unarranged: the Game was lost
    // long before it ended, so a third of what was played says nothing about how
    // the Player plays. A page showing the one figure without the other reads as
    // a bug precisely where the gap is the thing to explain.
    expect(recap!.playerMoves).toBeGreaterThan(recap!.countedMoves);
    expect(recap!.excluded.decided).toBeGreaterThan(0);
    expect(confronted().severity.countedMoves).toBe(recap!.countedMoves);
  });

  it("adds up: the scorable cells of the matrix ARE the accuracy denominator", () => {
    const { severity } = confronted();

    // The Player must be able to add what they see and land on the figure printed
    // beside it. On a real reading as on a built one.
    const scorable = Object.entries(severity.matrix)
      .filter(([declared]) => declared !== "good")
      .flatMap(([, row]) => Object.values(row))
      .reduce((a, b) => a + b, 0);

    expect(scorable).toBe(severity.scorable);
    expect(severity.agreed).toBeLessThanOrEqual(severity.scorable);
    expect(severity.scorable).toBeLessThanOrEqual(severity.examined);
    expect(severity.examined).toBeLessThanOrEqual(severity.countedMoves);
  });

  it("scores neither the opponent's Move nor the Move it excludes, and shows both", () => {
    const { severity, uncounted } = confronted();

    // Two verdicts the Player wrote that no figure may touch — for two different
    // reasons, and both have to remain visible or the counts look wrong.
    expect(severity.unscored.opponent).toBe(1);
    const declaredOnExcluded = uncounted.filter((move) => move.declared !== null);
    expect(declaredOnExcluded).toHaveLength(1);
    expect(declaredOnExcluded[0].reason).toBe("decided");
    // And it is named, not merely numbered.
    expect(declaredOnExcluded[0].notation).toBeTruthy();
  });

  it("finds all the damage, and still reports the marker that found none", () => {
    const { keyMoments } = confronted();

    // The combination no invented case produced: three markers, two on real
    // faults and one on nothing. The score is whole **and** the miss is shown —
    // which is what "additive, and no tolerance window" means. A marker that
    // misses costs nothing; it also gains nothing.
    expect(keyMoments.marked).toBe(3);
    expect(keyMoments.damageFound).toBeCloseTo(keyMoments.damageTotal, 10);
    expect(keyMoments.misses).toHaveLength(1);
    const [miss] = keyMoments.misses;
    expect(miss.lostThere).toBe(0);
    expect(miss.nearest!.lost).toBeGreaterThan(0);
    // Both Moves named, so the sentence can be acted on.
    expect(miss.notation).toBeTruthy();
    expect(miss.nearest!.notation).toBeTruthy();
  });

  it("reports the Drift beside the score without letting it into the division", () => {
    const { keyMoments } = confronted();
    const { recap } = annotations();

    // A third of what was lost answers to no flagged Move at all. Counting it
    // would have put a full score out of this reading's reach — and the reading
    // did name every fault there was.
    expect(keyMoments.drift).toBeGreaterThan(0);
    expect(keyMoments.damageTotal).toBe(recap!.flaggedLoss);
    expect(keyMoments.damageTotal + keyMoments.drift).toBeCloseTo(recap!.chancesLost, 10);
  });

  it("keeps the layer written after the reveal out of every figure", () => {
    const sealedOnly = {
      ...realReading(),
      marks: realReading().marks.filter((mark) => !mark.posterior),
    };
    const withPosterior = confronted();
    const without = confrontGame(sealedOnly, annotations(), gameNotations(REAL_READING_PGN));
    if (without instanceof ConfrontationRefusal) throw new Error("refused");

    expect(withPosterior.severity).toEqual(without.severity);
    expect(withPosterior.keyMoments.damageFound).toBe(without.keyMoments.damageFound);
    // Kept and shown, with the Player's own words.
    expect(withPosterior.posterior).toHaveLength(1);
    expect(withPosterior.posterior[0].note).toMatch(/n'importe quoi/);
  });

  it("is labelled by how it was written — unaided, which is what makes it worth anything", () => {
    expect(confronted().provenance).toBe("unaided");
  });
});
