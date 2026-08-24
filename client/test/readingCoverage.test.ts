import { describe, it, expect } from "vitest";
import { coverage, markKinds } from "../src/features/personal/coverage";
import type { PersonalMark } from "../src/types";

const mark = (over: Partial<PersonalMark> & { ply: number }): PersonalMark => ({
  declaredSeverity: null,
  note: null,
  keyMoment: false,
  posterior: false,
  ...over,
});

/**
 * **Coverage** — the share of Moves the Player has already examined. The figure
 * that says whether a reading is far enough along to be sealed, and the **same
 * fact** US-16b will report *beside* correctness, never folded into it. Nothing
 * here compares anything: no score, no justesse.
 */
describe("how much of a Game has been examined", () => {
  it("counts nothing examined on a reading with no marks", () => {
    expect(coverage([], 76)).toEqual({ examined: 0, moves: 76, share: 0 });
  });

  it("counts a ply once, however many things were said about it", () => {
    // Three statements about one Move are still one Move examined: coverage is a
    // count of Moves looked at, not of marks written.
    const marks = [mark({ ply: 3, declaredSeverity: "mistake", note: "x", keyMoment: true })];

    expect(coverage(marks, 76)).toEqual({ examined: 1, moves: 76, share: 1 / 76 });
  });

  it("counts each examined ply, and keeps the raw figures beside the share", () => {
    const marks = [mark({ ply: 3 }), mark({ ply: 9 }), mark({ ply: 21 })];

    // The count is always shown alongside the rate — the project's constant
    // habit, so the Player judges the figure's weight themselves.
    expect(coverage(marks, 30)).toEqual({ examined: 3, moves: 30, share: 0.1 });
  });

  it("excludes the starting Position: it is a Position, not a Move to examine", () => {
    const marks = [mark({ ply: 0, note: "sur l'ouverture en général" }), mark({ ply: 5 })];

    expect(coverage(marks, 76)).toEqual({ examined: 1, moves: 76, share: 1 / 76 });
  });

  it("counts a ply once when it carries both a sealed and a posterior mark", () => {
    const marks = [
      mark({ ply: 3, declaredSeverity: "sound" }),
      mark({ ply: 3, declaredSeverity: "blunder", posterior: true }),
    ];

    expect(coverage(marks, 76).examined).toBe(1);
  });

  it("says nothing rather than dividing by zero on a Game with no Moves", () => {
    expect(coverage([], 0)).toEqual({ examined: 0, moves: 0, share: 0 });
  });
});

/**
 * Which of the three kinds of mark a ply carries — what the move list shows so
 * the Player can see where they have written without opening every Move.
 */
describe("what a ply carries", () => {
  it("reports nothing for a ply nobody wrote on", () => {
    expect(markKinds([], 3)).toEqual({ verdict: false, note: false, keyMoment: false });
  });

  it("tells the three kinds apart", () => {
    const marks = [
      mark({ ply: 1, declaredSeverity: "mistake" }),
      mark({ ply: 2, note: "pourquoi" }),
      mark({ ply: 3, keyMoment: true }),
    ];

    expect(markKinds(marks, 1)).toEqual({ verdict: true, note: false, keyMoment: false });
    expect(markKinds(marks, 2)).toEqual({ verdict: false, note: true, keyMoment: false });
    expect(markKinds(marks, 3)).toEqual({ verdict: false, note: false, keyMoment: true });
  });

  it("reports all three when one ply carries all three", () => {
    const marks = [mark({ ply: 1, declaredSeverity: "good", note: "n", keyMoment: true })];

    expect(markKinds(marks, 1)).toEqual({ verdict: true, note: true, keyMoment: true });
  });

  it("folds the two layers together: a ply written on after the seal is still written on", () => {
    const marks = [mark({ ply: 1, note: "après coup", posterior: true })];

    expect(markKinds(marks, 1)).toEqual({ verdict: false, note: true, keyMoment: false });
  });
});
