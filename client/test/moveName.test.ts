import { describe, it, expect } from "vitest";
import { moveName, plyNumber, startingPoint } from "../src/features/confrontation/moveName";

/**
 * How a Move is numbered. One home, because it lived twice before and the two
 * copies drifted — and now three surfaces read from it: the confrontation's
 * sentences, and (US-23, D4) the move list of both screens that draw a board.
 */
describe("numbering a ply", () => {
  it("puts the number on BOTH halves of a Move, the side telling them apart", () => {
    // The list is a flat run of half-moves. Writing the whole Move's number on
    // each would give "12. Nf3" then "12. Nc6", and the second is false: it is
    // 12…Nc6.
    expect(plyNumber(1)).toBe("1.");
    expect(plyNumber(2)).toBe("1…");
    expect(plyNumber(23)).toBe("12.");
    expect(plyNumber(24)).toBe("12…");
  });

  it("counts from where the Game actually starts, when that is not the usual place", () => {
    // A Game set up from a Position has Black to move at ply 1, and its Moves
    // are numbered from that Position's own Move number — not from 1., and not
    // as if White had opened.
    const start = startingPoint("r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 3 12");
    expect(start).toEqual({ side: "black", number: 12 });

    expect(plyNumber(1, start)).toBe("12…");
    expect(plyNumber(2, start)).toBe("13.");
    expect(plyNumber(3, start)).toBe("13…");
  });

  it("reads the usual starting place out of its own FEN, unchanged", () => {
    const start = startingPoint("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(start).toEqual({ side: "white", number: 1 });
    expect(plyNumber(1, start)).toBe("1.");
    expect(plyNumber(2, start)).toBe("1…");
  });

  it("falls back to the usual start when the FEN says nothing usable", () => {
    // A poorer answer, and still a true one for the overwhelming case. Nothing
    // here is ever load-bearing for a figure.
    expect(startingPoint("")).toEqual({ side: "white", number: 1 });
    expect(startingPoint("not a fen")).toEqual({ side: "white", number: 1 });
  });
});

describe("naming a Move to the Player", () => {
  it("still puts the notation after the number, as it always did", () => {
    expect(moveName(41, "Rd1")).toBe("21.Rd1");
    expect(moveName(42, "Nxe5")).toBe("21…Nxe5");
    expect(moveName(41)).toBe("21.");
  });

  it("names it from the Game's own starting point when given one", () => {
    const start = { side: "black" as const, number: 12 };
    expect(moveName(1, "Nc6", start)).toBe("12…Nc6");
  });
});
