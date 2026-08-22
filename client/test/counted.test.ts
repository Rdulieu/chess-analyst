import { describe, it, expect } from "vitest";
import { COUNTED_STATEMENT, marksUncounted } from "../src/chess/counted";
import type { MoveAnnotation } from "../src/types";

const move = (
  counted: MoveAnnotation["counted"],
  severity: MoveAnnotation["severity"] = null,
): MoveAnnotation => ({
  ply: 1,
  whiteEval: { cp: 0, mate: null },
  whiteWinChances: 50,
  severity,
  bestLine: [],
  phase: "middlegame",
  counted,
  chancesLost: 0,
});

describe("Counted Move — what the move list marks", () => {
  it("marks a flawed Move that does not count: what a Game shows and what it contributes disagree there", () => {
    expect(marksUncounted(move({ counted: false, reason: "forced" }, "blunder"))).toBe(true);
  });

  it("marks NOTHING on an uncounted Move that carries no severity", () => {
    // A Game lost at move 25 excludes every Move after it. Marking them would
    // put eighteen marks carrying no surprise on the surface used for scanning —
    // slice 05's summary is where those are said, in aggregate.
    expect(marksUncounted(move({ counted: false, reason: "decided" }))).toBe(false);
  });

  it("marks nothing on a Move that counts, flawed or not", () => {
    expect(marksUncounted(move({ counted: true, reason: null }, "mistake"))).toBe(false);
    expect(marksUncounted(move({ counted: true, reason: null }))).toBe(false);
  });

  it("marks nothing on the opponent's Moves, about which nothing is derived", () => {
    expect(marksUncounted(move(null, "blunder"))).toBe(false);
  });
});

describe("Counted Move — what the panel says", () => {
  it("states both reasons in words, kept distinct", () => {
    expect(COUNTED_STATEMENT.forced).toMatch(/forcé/i);
    expect(COUNTED_STATEMENT.decided).toMatch(/déjà/i);
    // Two different sentences: a Player who cannot tell them apart can audit
    // neither.
    expect(COUNTED_STATEMENT.forced).not.toBe(COUNTED_STATEMENT.decided);
  });
});

describe("Counted Move — the mark names its reason", () => {
  it("says which reason, on the scanning surface too — the two are kept apart everywhere", async () => {
    const { UNCOUNTED_MARK } = await import("../src/chess/counted");

    expect(UNCOUNTED_MARK.forced.text).toBe("forcé");
    expect(UNCOUNTED_MARK.forced.name).toMatch(/non compté/i);
    // Defined rather than assumed unreachable: if it ever renders, it says what
    // it means instead of a generic phrase.
    expect(UNCOUNTED_MARK.decided.text).not.toBe(UNCOUNTED_MARK.forced.text);
  });
});
