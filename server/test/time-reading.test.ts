import { describe, it, expect } from "vitest";
import { gameTime } from "../src/analysis/time";
import { REAL_READING_PGN } from "./fixtures/real-reading";

/**
 * The Game's own reading of the time (US-15b, slice 03) — what the Player gets
 * without counting thirty lines themselves.
 *
 * **It is the sum of what the Moves carry, never a parallel calculation.** That
 * is ADR-0017's discipline, and the reason these tests recompute the expected
 * figures from `time.plies` rather than hard-coding them: if the two ever
 * disagreed, the Player's ability to audit the panel against the column — the
 * EPIC's whole requirement — would be gone.
 *
 * **No threshold is invented here.** "Marginal or conditional rates" is US-15c,
 * and ADR-0023 records what choosing a threshold on paper costs. What this owes
 * 15c is a number per Move and a rule for the denominator.
 */
describe("the Game's time reading", () => {
  const time = gameTime(REAL_READING_PGN, "white");
  // The Player is White in this Game (a 60+1 blitz loss of theirs).
  const reading = time.reading!;

  it("exists on a Game with clocks", () => {
    expect(reading).not.toBeNull();
  });

  it("counts only the Player's own Moves, like everything else in the recap", () => {
    // 76 half-moves, White to move on the odd plies.
    const playerPlies = time.plies.filter((ply) => ply.ply > 0 && ply.ply % 2 === 1);
    expect(reading.moves).toBe(playerPlies.length);
  });

  it("totals exactly the Time spent of the Player's Moves in the column", () => {
    // Recomputed from the column, deliberately: the panel must be recoupable by
    // hand against the very numbers beside it.
    const expected = time.plies
      .filter((ply) => ply.ply > 0 && ply.ply % 2 === 1)
      .reduce((total, ply) => total + (ply.spentCs ?? 0), 0);
    expect(reading.totalSpentCs).toBe(expected);
  });

  it("names the Player's longest Moves, and they are the column's longest", () => {
    const expected = [...time.plies]
      .filter((ply) => ply.ply > 0 && ply.ply % 2 === 1 && ply.spentCs !== null)
      .sort((a, b) => b.spentCs! - a.spentCs!)[0];
    expect(reading.longest[0].ply).toBe(expected.ply);
    expect(reading.longest[0].spentCs).toBe(expected.spentCs);
  });

  it("counts the Player's Moves played under the low clock it names", () => {
    // The reading states the mark it counted against, so the Player can count
    // the same Moves themselves rather than take the figure on trust.
    const expected = time.plies.filter(
      (ply) =>
        ply.ply > 0 &&
        ply.ply % 2 === 1 &&
        ply.clockCs !== null &&
        ply.clockCs < reading.lowClockCs,
    ).length;
    expect(reading.underLowClock).toBe(expected);
  });

  it("reads the low-clock mark off the cadence, not off a number chosen on paper", () => {
    // A tenth of the initial budget: 60 s here, so 6 s. It is a SCALE, not a
    // severity threshold — ADR-0023 is about the latter, and 15b adds none.
    expect(reading.lowClockCs).toBe(600);
  });

  it("is read inside one Time control category, and says which", () => {
    // A second in bullet and a second in classical are not the same second, so
    // the reading carries the cadence it is to be read within — it never
    // compares two.
    expect(reading.timeControl).toEqual({ kind: "realtime", initialCs: 6_000, incrementCs: 100 });
  });
});

describe("a Game with no clock to read", () => {
  it("gives a correspondence Game no reading at all, rather than one at zero", () => {
    const time = gameTime('[TimeControl "2 days per move"]\n\n1. e4 e5 1/2-1/2', "white");
    expect(time.reading).toBeNull();
    expect(time.absence).toBe("not-applicable");
  });

  it("gives a real-time Game with no recorded clock no reading either", () => {
    const time = gameTime('[TimeControl "600+5"]\n\n1. e4 e5 1/2-1/2', "white");
    expect(time.reading).toBeNull();
    expect(time.absence).toBe("not-recorded");
  });
});
