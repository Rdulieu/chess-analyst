import { describe, it, expect } from "vitest";
import { readingProgress, markKinds } from "../src/features/personal/progress";
import type { PersonalMark } from "../src/types";

const mark = (over: Partial<PersonalMark> & { ply: number }): PersonalMark => ({
  declaredSeverity: null,
  note: null,
  keyMoment: false,
  posterior: false,
  ...over,
});

/**
 * **How far the reading has got** — the share of the Game's Moves the Player has
 * written something on, and the figure that says whether a reading is advanced
 * enough to seal. Nothing here compares anything: no score, no accuracy.
 *
 * Deliberately **not** the `Confrontation`'s coverage, which runs over the
 * Player's `Counted Move`s so it shares accuracy's denominator. Two honest
 * figures on two denominators, and no longer one word for both.
 */
describe("how far a reading has got", () => {
  it("counts nothing annotated on a reading with no marks", () => {
    expect(readingProgress([], 76)).toEqual({ annotated: 0, moves: 76, share: 0 });
  });

  it("counts a ply once, however many things were said about it", () => {
    // Three statements about one Move are still one Move written on: this is a
    // count of Moves looked at, not of marks written.
    const marks = [mark({ ply: 3, declaredSeverity: "mistake", note: "x", keyMoment: true })];

    expect(readingProgress(marks, 76)).toEqual({ annotated: 1, moves: 76, share: 1 / 76 });
  });

  it("counts each annotated ply, and keeps the raw figures beside the share", () => {
    const marks = [mark({ ply: 3 }), mark({ ply: 9 }), mark({ ply: 21 })];

    // The count is always shown alongside the rate — the project's constant
    // habit, so the Player judges the figure's weight themselves.
    expect(readingProgress(marks, 30)).toEqual({ annotated: 3, moves: 30, share: 0.1 });
  });

  it("excludes the starting Position: it is a Position, not a Move to examine", () => {
    const marks = [mark({ ply: 0, note: "sur l'ouverture en général" }), mark({ ply: 5 })];

    expect(readingProgress(marks, 76)).toEqual({ annotated: 1, moves: 76, share: 1 / 76 });
  });

  it("counts a ply once when it carries both a sealed and a posterior mark", () => {
    const marks = [
      mark({ ply: 3, declaredSeverity: "sound" }),
      mark({ ply: 3, declaredSeverity: "blunder", posterior: true }),
    ];

    expect(readingProgress(marks, 76).annotated).toBe(1);
  });

  it("says nothing rather than dividing by zero on a Game with no Moves", () => {
    expect(readingProgress([], 0)).toEqual({ annotated: 0, moves: 0, share: 0 });
  });
});

/**
 * Which of the three kinds of mark a ply carries — what the move list shows so
 * the Player can see where they have written without opening every Move.
 */
describe("what a ply carries", () => {
  it("reports nothing for a ply nobody wrote on", () => {
    expect(markKinds([], 3)).toEqual({ verdict: null, note: false, keyMoment: false });
  });

  it("tells the three kinds apart, and says WHICH verdict", () => {
    // The verdict stopped being a boolean in US-22: the move list draws the value
    // itself, because "a verdict exists here" sent the Player to open the Move.
    const marks = [
      mark({ ply: 1, declaredSeverity: "mistake" }),
      mark({ ply: 2, note: "pourquoi" }),
      mark({ ply: 3, keyMoment: true }),
    ];

    expect(markKinds(marks, 1)).toEqual({ verdict: "mistake", note: false, keyMoment: false });
    expect(markKinds(marks, 2)).toEqual({ verdict: null, note: true, keyMoment: false });
    expect(markKinds(marks, 3)).toEqual({ verdict: null, note: false, keyMoment: true });
  });

  it("reports all three when one ply carries all three", () => {
    const marks = [mark({ ply: 1, declaredSeverity: "good", note: "n", keyMoment: true })];

    expect(markKinds(marks, 1)).toEqual({ verdict: "good", note: true, keyMoment: true });
  });

  it("folds the two layers together: a ply written on after the seal is still written on", () => {
    const marks = [mark({ ply: 1, note: "après coup", posterior: true })];

    expect(markKinds(marks, 1)).toEqual({ verdict: null, note: true, keyMoment: false });
  });

  it("draws the SEALED verdict when both layers speak — the list must not contradict what is scored", () => {
    // Measured on the FP of 2026-08-28. Drawing the posterior layer read well in
    // the abstract and was wrong in practice: the `Confrontation` scores the
    // sealed layer and discards the posterior one, so a list showing the
    // posterior verdict tells a Player scanning for what they will be graded on
    // the opposite of the truth. `⚖` could not do that — it made no claim about
    // WHICH verdict, so it could not contradict one. Saying which is the whole
    // point of this slice, and it is what makes the layer matter.
    const marks = [
      mark({ ply: 1, declaredSeverity: "mistake", posterior: false }),
      mark({ ply: 1, declaredSeverity: "blunder", posterior: true }),
    ];

    expect(markKinds(marks, 1).verdict).toBe("mistake");
  });

  it("still draws a purely posterior verdict — it contradicts nothing, and silence would lose it", () => {
    const marks = [mark({ ply: 1, declaredSeverity: "blunder", posterior: true })];

    expect(markKinds(marks, 1).verdict).toBe("blunder");
  });
});
