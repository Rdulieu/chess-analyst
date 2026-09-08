import { describe, it, expect } from "vitest";
import { formatDuration, formatClock } from "../src/chess/moveTime";

/**
 * How a time is **said** (US-15b). The precision is the material's, not a
 * display preference: chess.com's PGN carries tenths, Lichess's rounds to the
 * second (ADR-0029). A column that printed `1,0 s` on a Lichess Game would
 * assert a tenth that is only good to ±1 s.
 */
describe("formatDuration", () => {
  it("gives a tenth where the source carries tenths", () => {
    expect(formatDuration(20, "tenths")).toBe("0,2 s");
    expect(formatDuration(1_830, "tenths")).toBe("18,3 s");
  });

  it("gives a whole second where the source rounds to the second", () => {
    // No decimal at all — not `18,0 s`, which would claim a precision the
    // material never carried.
    expect(formatDuration(1_800, "seconds")).toBe("18 s");
    expect(formatDuration(1_830, "seconds")).toBe("18 s");
  });

  it("says a long time in minutes and seconds, which is how anyone reads it", () => {
    expect(formatDuration(9_000, "seconds")).toBe("1 min 30 s");
    // Still a tenth, because the whole column is at tenths: `0,0` beside `18,3`
    // reads as one precision, where a bare `0` reads as a different figure.
    expect(formatDuration(36_000, "tenths")).toBe("6 min 0,0 s");
  });

  it("says nothing rather than a zero when there is no figure", () => {
    expect(formatDuration(null, "tenths")).toBeNull();
    expect(formatDuration(20, null)).toBeNull();
  });
});

describe("formatClock", () => {
  it("reads a remaining clock as a stopwatch does", () => {
    expect(formatClock(6_080, "tenths")).toBe("1 min 0,8 s");
    expect(formatClock(1_800, "seconds")).toBe("18 s");
  });

  it("says nothing rather than a zero when there is no figure", () => {
    expect(formatClock(null, "tenths")).toBeNull();
  });

  it("says a real zero, because a flag that fell is a fact", () => {
    // The one place a `0` is legitimate: the Player genuinely had no time left.
    // It is still printed at the column's precision.
    expect(formatClock(0, "tenths")).toBe("0,0 s");
    expect(formatClock(0, "seconds")).toBe("0 s");
  });
});
