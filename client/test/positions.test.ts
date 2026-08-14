import { describe, it, expect } from "vitest";
import { positionAfter, sideToMove } from "../src/chess/positions";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

describe("positionAfter", () => {
  it("returns the starting Position (4-field FEN) for an empty path", () => {
    expect(positionAfter([])).toBe(START);
  });

  it("replays the Moves from the start and returns the resulting 4-field FEN", () => {
    // After 1. e4 it is Black to move, with e3 as the en-passant target.
    expect(positionAfter(["e4"])).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3",
    );
    // After 1. e4 e5 it is White to move again, en-passant target e6.
    expect(positionAfter(["e4", "e5"])).toBe(
      "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6",
    );
  });
});

describe("sideToMove", () => {
  it("reads the active colour of a full FEN", () => {
    expect(sideToMove(START + " 0 1")).toBe("white");
    expect(sideToMove("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1")).toBe("black");
  });

  it("reads it from a 4-field FEN too — the identity a Danger position is stored under", () => {
    expect(sideToMove(START)).toBe("white");
    expect(sideToMove("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3")).toBe("black");
  });
});
