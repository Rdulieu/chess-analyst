import { describe, it, expect } from "vitest";
import { timeControlOf } from "../src/analysis/time";

/**
 * The one named translation of `[TimeControl]` (ADR-0029). Both Platforms spell
 * the same facts differently, and every entry point goes through here — so what
 * these cases pin is that four spellings collapse to two shapes, and that a
 * Game with no header is *absent*, never a zero.
 */
describe("timeControlOf", () => {
  const pgnWith = (tag: string | null) =>
    `[White "a"]\n[Black "b"]\n${tag === null ? "" : `[TimeControl "${tag}"]\n`}\n1. e4 e5 1/2-1/2`;

  it("reads chess.com's bare budget as a real-time control with a zero increment", () => {
    // `300` is not "no increment known": it is an increment of zero.
    expect(timeControlOf(pgnWith("300"))).toEqual({
      kind: "realtime",
      initialCs: 30_000,
      incrementCs: 0,
    });
  });

  it("reads a budget with an increment, whichever Platform spelled it", () => {
    expect(timeControlOf(pgnWith("180+2"))).toEqual({
      kind: "realtime",
      initialCs: 18_000,
      incrementCs: 200,
    });
    // Lichess spells the same fact with the increment always written out.
    expect(timeControlOf(pgnWith("300+0"))).toEqual({
      kind: "realtime",
      initialCs: 30_000,
      incrementCs: 0,
    });
    expect(timeControlOf(pgnWith("600+5"))).toEqual({
      kind: "realtime",
      initialCs: 60_000,
      incrementCs: 500,
    });
  });

  it("gives one day per move the same answer from both spellings", () => {
    // The whole point of one function: `1/86400` and `1 day per move` are two
    // orthographies of an identical fact, and must not become two shapes.
    expect(timeControlOf(pgnWith("1/86400"))).toEqual({
      kind: "correspondence",
      daysPerMove: 1,
    });
    expect(timeControlOf(pgnWith("1 day per move"))).toEqual({
      kind: "correspondence",
      daysPerMove: 1,
    });
  });

  it("counts the days, rather than recognising only the one-day case", () => {
    expect(timeControlOf(pgnWith("1/259200"))).toEqual({
      kind: "correspondence",
      daysPerMove: 3,
    });
    expect(timeControlOf(pgnWith("2 days per move"))).toEqual({
      kind: "correspondence",
      daysPerMove: 2,
    });
  });

  it("says absent when the PGN carries no time control, rather than a zero", () => {
    expect(timeControlOf(pgnWith(null))).toBeNull();
    // PGN's own token for "no time control" is a fact of absence too.
    expect(timeControlOf(pgnWith("-"))).toBeNull();
    // And a spelling neither Platform has ever sent is not guessed at.
    expect(timeControlOf(pgnWith("something else"))).toBeNull();
  });

  it("refuses a divisor that is not a whole number of days, rather than a fraction", () => {
    // `1/43200` is half a day. Answered as `0.5` it renders "0.5 jour par coup"
    // — a decimal point where this app writes a comma, and a plural that reads
    // the wrong way round. Saying nothing is honest; saying that is not.
    expect(timeControlOf(pgnWith("1/43200"))).toBeNull();
    // And the whole-day cases still answer, which is what makes this a refusal
    // of the fraction rather than of the form.
    expect(timeControlOf(pgnWith("1/86400"))).toEqual({ kind: "correspondence", daysPerMove: 1 });
    expect(timeControlOf(pgnWith("1/604800"))).toEqual({ kind: "correspondence", daysPerMove: 7 });
  });

  it("reads a Game whose movetext is empty, which an aborted Game has", () => {
    expect(timeControlOf('[TimeControl "60+1"]\n\n*')).toEqual({
      kind: "realtime",
      initialCs: 6_000,
      incrementCs: 100,
    });
  });
});
