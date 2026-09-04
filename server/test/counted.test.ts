import { describe, it, expect } from "vitest";
import { countedMoves, type MoveCount } from "../src/analysis/counted";
import { classifyMove } from "../src/danger/move-quality";
import type { Ply } from "../src/analysis/derivation";

/** A ply with only what this derivation reads: the Position and the winning
 *  chances of whoever is to move there. */
const ply = (fen: string, winChances: number): Ply => ({
  fen,
  evaluation: { cp: 0, mate: null },
  winChances,
  bestLine: [],
});

/** A quiet Position with many legal Moves, White to move. */
const OPEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
/** The same, Black to move. */
const OPEN_BLACK = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1";
/** White is in check from the rook on g1, boxed in by their own pawns: `Kxg1`
 *  is the **only** legal Move. No engine is needed to know that. */
const SOLE_LEGAL = "7k/8/8/8/8/8/5PPP/6rK w - - 0 1";

const reasons = (counted: (MoveCount | null)[]) =>
  counted.map((c) => (c === null ? null : c.counted ? "counted" : c.reason));

describe("Counted Move — whose Moves are even considered", () => {
  it("derives nothing at all for the opponent's Moves", () => {
    // Not "counted: false" — nothing is asserted about them, because the
    // denominator is a statement about the Player's play alone.
    const plies = [ply(OPEN, 50), ply(OPEN_BLACK, 50), ply(OPEN, 50)];

    const counted = countedMoves(plies, "white");

    // Index i is the Move leading to ply i; ply 0 is no Move at all.
    expect(counted[0]).toBeNull();
    expect(counted[1]).not.toBeNull(); // White's own Move
    expect(counted[2]).toBeNull(); // Black's
  });
});

describe("Counted Move — forced", () => {
  it("does not count a Move that was the only legal one, and says it was forced", () => {
    const counted = countedMoves([ply(SOLE_LEGAL, 50), ply(OPEN_BLACK, 50)], "white");

    expect(counted[1]).toEqual({ counted: false, reason: "forced" });
  });

  it("counts a Move played in a Position that offered alternatives", () => {
    const counted = countedMoves([ply(OPEN, 50), ply(OPEN_BLACK, 50)], "white");

    expect(counted[1]).toEqual({ counted: true, reason: null });
  });
});

describe("Counted Move — already decided", () => {
  it("does not count a Move played under the Inaccuracy floor, and says the Position was decided", () => {
    // 9%: the metric cannot record a 10% drop from here, so the Move can say
    // nothing about the Player's play.
    const counted = countedMoves([ply(OPEN, 9), ply(OPEN_BLACK, 50)], "white");

    expect(counted[1]).toEqual({ counted: false, reason: "decided" });
  });

  it("puts the floor exactly at 10, strictly under being the excluded side", () => {
    // The boundary itself, written as a NUMBER and not as the imported constant:
    // a test that imports the threshold still passes after a retune that changes
    // what the threshold means, which is the whole trap this story closes.
    const under = countedMoves([ply(OPEN, 9.9), ply(OPEN_BLACK, 50)], "white");
    const at = countedMoves([ply(OPEN, 10), ply(OPEN_BLACK, 50)], "white");

    expect(under[1]).toEqual({ counted: false, reason: "decided" });
    expect(at[1]).toEqual({ counted: true, reason: null });
  });

  it("counts a Move played while WINNING — the rule is asymmetric on purpose", () => {
    // 88%: a symmetric band around equality would delete the inability to
    // convert a won Position, which is one of the realest weaknesses there is.
    const counted = countedMoves([ply(OPEN, 88), ply(OPEN_BLACK, 50)], "white");

    expect(counted[1]).toEqual({ counted: true, reason: null });
  });

  it("reads the chances of the Position BEFORE the Move, which is the Player's own", () => {
    // Black's Moves land on the even indices. The Position before Black's first
    // Move has Black to move, so its winning chances are already the Player's:
    // there is no side to flip, and flipping one would invert the whole rule.
    const plies = [ply(OPEN, 95), ply(OPEN_BLACK, 4), ply(OPEN, 95)];

    const counted = countedMoves(plies, "black");

    expect(counted[1]).toBeNull(); // White's Move
    expect(counted[2]).toEqual({ counted: false, reason: "decided" });
  });
});

describe("Counted Move — the two reasons do not behave alike", () => {
  it("keeps 'forced' as the reason for a Move that is BOTH flagged and forced", () => {
    // The sole legal recapture that happens to be catastrophic: flagged, and
    // still nobody's mistake. The only overlap the two sets have.
    const counted = countedMoves([ply(SOLE_LEGAL, 60), ply(OPEN_BLACK, 60)], "white");

    expect(counted[1]).toEqual({ counted: false, reason: "forced" });
  });

  it("CAN exclude a flagged Move as 'already decided' — the sets stopped being disjoint at US-37", () => {
    // This test used to assert the opposite, and the arithmetic backed it:
    // flagging asked for a 10% drop, hence 10% left to lose, and nothing under
    // the floor had that much. The band is 5 now and the floor is still 10, so a
    // Position between the two can produce a flagged Move that does not count.
    //
    // What survives untouched is the exclusion itself: every Position under the
    // floor is still excluded, and still says `decided`. Asserted over the whole
    // floor rather than on one case, exactly as before.
    for (let before = 0; before < 10; before++) {
      const counted = countedMoves([ply(OPEN, before), ply(OPEN_BLACK, 0)], "white");
      expect(counted[1]).toEqual({ counted: false, reason: "decided" });
    }

    // And the overlap is real rather than theoretical: from 5.8% of chances, a
    // Move can drop 5.5 and be flagged — a Position the corpus actually contains.
    expect(classifyMove(5.8, 0.3)).toBe("inaccuracy");
    const counted = countedMoves([ply(OPEN, 5.8), ply(OPEN_BLACK, 99.7)], "white");
    expect(counted[1]).toEqual({ counted: false, reason: "decided" });
  });
});

describe("Counted Move — which reason wins when both apply", () => {
  it("says 'forced' rather than 'decided' when the Player had no choice in a lost Position", () => {
    // Both hold; "forced" is the stronger statement — there was nothing to
    // choose, whatever the evaluation said.
    const counted = countedMoves([ply(SOLE_LEGAL, 3), ply(OPEN_BLACK, 3)], "white");

    expect(counted[1]).toEqual({ counted: false, reason: "forced" });
  });
});

describe("reasons()", () => {
  it("reads as a Game-long sequence", () => {
    const plies = [ply(OPEN, 50), ply(OPEN_BLACK, 50), ply(OPEN, 4), ply(OPEN_BLACK, 50)];

    expect(reasons(countedMoves(plies, "white"))).toEqual([null, "counted", null, "decided"]);
  });
});
