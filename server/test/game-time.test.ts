import { describe, it, expect } from "vitest";
import { gameTime } from "../src/analysis/time";
import { REAL_READING_PGN } from "./fixtures/real-reading";

/**
 * What a Game says about time, on **real** material wherever possible
 * (ADR-0029). `REAL_READING_PGN` is one of the Player's own 60+1 chess.com
 * blitz Games, carrying a `[%clk]` on every half-move at tenth precision — the
 * 1983 chess.com Games in the corpus all look like this, and nothing read them
 * before this story.
 *
 * These cases describe **what the Player gets**, not how: "a Move played in
 * 0.2 s reports 0.2 s". Only the extraction test below knows what a `[%clk]`
 * looks like.
 */
describe("gameTime", () => {
  describe("a real chess.com 60+1 Game", () => {
    const time = gameTime(REAL_READING_PGN, "white");

    it("records a Clock for every half-move, and nothing for the starting Position", () => {
      // 76 half-moves; index 0 is the start, which no side has played to.
      expect(time.plies).toHaveLength(77);
      expect(time.plies[0]).toEqual({
        ply: 0,
        clockCs: null,
        spentCs: null,
        shareOfRemaining: null,
      });
      expect(time.plies[76].clockCs).not.toBeNull();
    });

    it("reads the first Clock of the Game as the PGN wrote it", () => {
      // `1. b3 {[%clk 0:01:00.8]}` — 60.8 s left, in centiseconds.
      expect(time.plies[1].clockCs).toBe(6_080);
    });

    it("derives the first Move's Time spent from the cadence, so line 1 is not a hole", () => {
      // 60 s budget + 1 s increment − 60.8 s left = 0.2 s thought.
      expect(time.plies[1].spentCs).toBe(20);
      // Black's first Move is its own first too: 60 + 1 − 59.9 = 1.1 s.
      expect(time.plies[2].spentCs).toBe(110);
    });

    it("derives a later Move's Time spent from the same side's previous Clock, plus the increment", () => {
      // White: 60.8 s left after 1.b3, 61.7 s left after 2.Bb2 — with a second
      // added each Move, that is 0.1 s of thought, not a gain of 0.9 s.
      expect(time.plies[3].clockCs).toBe(6_170);
      expect(time.plies[3].spentCs).toBe(10);
    });

    it("carries both figures for the opponent's Moves too", () => {
      // Who suffered the pressure and who inflicted it is the question, so both
      // sides are measured.
      expect(time.plies[2].clockCs).toBe(5_990);
      expect(time.plies[4].spentCs).not.toBeNull();
    });

    it("reports the Clock as recorded, at the tenth the source carries", () => {
      expect(time.absence).toBeNull();
      // chess.com writes tenths (`0:01:00.8`), so a decimal on screen is real.
      expect(time.precision).toBe("tenths");
    });

    it("keeps everything an integer count of centiseconds", () => {
      for (const ply of time.plies) {
        if (ply.clockCs !== null) expect(Number.isInteger(ply.clockCs)).toBe(true);
        if (ply.spentCs !== null) expect(Number.isInteger(ply.spentCs)).toBe(true);
      }
    });
  });

  describe("what share of the clock a Move cost", () => {
    // Asked for on 2026-09-09: not just "12 s", but "12 s out of the 40 you had".
    // The same 12 s is a shrug at the start of a Game and a catastrophe at the end,
    // and the figure that tells them apart is the share.
    const time = gameTime(REAL_READING_PGN, "white");

    it("measures the Move against what the side had BEFORE playing it", () => {
      // White's first Move on a 60+1: 0.2 s out of the 60 s budget = 0.33 %.
      // The budget, not budget + increment: the increment is granted for having
      // played, so it was not available to think with.
      expect(time.plies[1].shareOfRemaining).toBeCloseTo((20 / 6_000) * 100, 4);
    });

    it("measures a later Move against that side's own previous Clock", () => {
      // 2.Bb2 took 0.1 s, and White had 60.8 s when it began.
      expect(time.plies[3].shareOfRemaining).toBeCloseTo((10 / 6_080) * 100, 4);
    });

    it("grows as the clock shrinks, on the same time spent", () => {
      // The whole point of the figure. 38.Ka3 took 1.1 s with 14.5 s left; the
      // same 1.1 s at the start of the Game was worth a fraction of that share.
      const late = time.plies[75].shareOfRemaining!;
      const early = time.plies[3].shareOfRemaining!;
      expect(late).toBeGreaterThan(early);
    });

    it("says nothing rather than a zero where the Time spent is unknown", () => {
      const unknown = gameTime(
        '[TimeControl "180+2"]\n\n1. e4 1... e5 {[%clk 0:02:58]} 1/2-1/2',
        "white",
      );
      expect(unknown.plies[1].spentCs).toBeNull();
      expect(unknown.plies[1].shareOfRemaining).toBeNull();
    });

    it("has none on a correspondence Game, which has no clock to spend", () => {
      const daily = gameTime('[TimeControl "2 days per move"]\n\n1. e4 e5 1/2-1/2', "white");
      expect(daily.plies[1].shareOfRemaining).toBeNull();
    });
  });

  describe("a Lichess Game, whose PGN rounds to the second", () => {
    // Real shape: an analysed Lichess Game's comment carries SEVERAL tokens.
    const LICHESS = [
      '[TimeControl "180+2"]',
      "",
      "1. e4 {[%eval 0.18] [%clk 0:03:00]} 1... e5 {[%eval 0.15] [%clk 0:03:00]}",
      "2. Nf3 {[%eval 0.2] [%clk 0:02:59]} 2... Nc6 {[%clk 0:02:58]} 1/2-1/2",
    ].join("\n");

    it("pulls the Clock out of a comment holding several tokens", () => {
      // The one test that is allowed to know what a `[%clk]` looks like — and the
      // trap it guards: the comment is not the clock, the clock is a token in it.
      const time = gameTime(LICHESS, "white");
      expect(time.plies[1].clockCs).toBe(18_000);
      expect(time.plies[3].clockCs).toBe(17_900);
    });

    it("says its precision is the whole second, so no decimal claims what it cannot", () => {
      // A difference of two second-rounded readings is accurate to ±1 s: printing
      // `1,0 s` there would assert a tenth the material never carried.
      expect(gameTime(LICHESS, "white").precision).toBe("seconds");
    });
  });

  describe("a correspondence Game", () => {
    // Lichess's own spelling; chess.com's `1/86400` reaches the same shape.
    const DAILY = '[TimeControl "2 days per move"]\n\n1. e4 e5 2. Nf3 Nc6 1/2-1/2';

    it("has a Time control and no Clock at all, one empty entry per half-move", () => {
      const time = gameTime(DAILY, "white");
      expect(time.timeControl).toEqual({ kind: "correspondence", daysPerMove: 2 });
      // 4 half-moves plus the starting Position: index-aligned, all empty. A short
      // array would let a caller indexing by ply fall off the end.
      expect(time.plies).toHaveLength(5);
      expect(time.plies.every((ply) => ply.clockCs === null && ply.spentCs === null)).toBe(true);
    });

    it("says the Clock is NOT APPLICABLE — never that it has not been fetched", () => {
      // The distinction the whole story turns on. A correspondence Game has no
      // clock to have; a real-time Game whose PGN carries none is missing data.
      // Melting the two would make a future aggregate average a fiction.
      expect(gameTime(DAILY, "white").absence).toBe("not-applicable");
      expect(gameTime(DAILY, "white").precision).toBeNull();
    });

    it("reports no Clock as absent, and never as a zero", () => {
      for (const ply of gameTime(DAILY, "white").plies) {
        expect(ply.clockCs).not.toBe(0);
        expect(ply.spentCs).not.toBe(0);
      }
    });
  });

  describe("a real-time Game whose PGN carries no clock", () => {
    // Every one of the 434 Lichess Games in the corpus, until the refresh of
    // slice 05: the export was never asked for `clocks=true`.
    const NO_CLK = '[TimeControl "600+5"]\n\n1. e4 e5 1/2-1/2';

    it("says the Clock was NOT RECORDED — a different fact from not applicable", () => {
      const time = gameTime(NO_CLK, "white");
      expect(time.absence).toBe("not-recorded");
      expect(time.plies.every((ply) => ply.clockCs === null)).toBe(true);
    });
  });

  describe("a Game with no Time control at all", () => {
    it("still reports its Clocks, and declines to invent a Time spent", () => {
      // Without the increment there is no honest difference to state, so the
      // Clock is given and the Time spent is withheld rather than guessed.
      const time = gameTime("1. e4 {[%clk 0:01:00]} 1... e5 {[%clk 0:00:58]} 1/2-1/2", "white");
      expect(time.timeControl).toBeNull();
      expect(time.plies[1].clockCs).toBe(6_000);
      expect(time.plies[1].spentCs).toBeNull();
    });
  });

  describe("a Game with no Move", () => {
    it("reports the starting Position and nothing else", () => {
      // An aborted Game is a Game we keep on purpose (US-12).
      const time = gameTime('[TimeControl "180+2"]\n\n*', "white");
      expect(time.plies).toEqual([
        { ply: 0, clockCs: null, spentCs: null, shareOfRemaining: null },
      ]);
    });
  });
});

/**
 * A `Time spent` cannot be negative, and what a negative MEANS depends on the
 * material — so the two are deliberately not treated alike (found in review).
 */
describe("a Clock that goes the wrong way", () => {
  it("floors it at zero where the source rounds to the second", () => {
    // Lichess rounds, so a difference is only good to ±1 s (ADR-0029): a small
    // negative is an artefact of that rounding, and "about none" is the honest
    // reading. The Move WAS played.
    const time = gameTime(
      '[TimeControl "180+0"]\n\n1. e4 {[%clk 0:03:00]} 1... e5 {[%clk 0:03:00]} 2. Nf3 {[%clk 0:03:01]} 1/2-1/2',
      "white",
    );

    expect(time.precision).toBe("seconds");
    expect(time.plies[3].spentCs).toBe(0);
  });

  it("says NO figure where the source carries tenths, because rounding cannot explain it", () => {
    // chess.com writes tenths, so a negative here is an inconsistency in the
    // data, not a rounding artefact. Flooring it would hand a fabricated zero to
    // the aggregate US-15c will build.
    const time = gameTime(
      '[TimeControl "180+0"]\n\n1. e4 {[%clk 0:03:00.0]} 1... e5 {[%clk 0:02:59.0]} 2. Nf3 {[%clk 0:03:05.0]} 1/2-1/2',
      "white",
    );

    expect(time.precision).toBe("tenths");
    expect(time.plies[3].spentCs).toBeNull();
  });
});
