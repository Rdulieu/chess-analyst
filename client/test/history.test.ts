import { describe, it, expect } from "vitest";
import { FEN } from "cm-chess";
import { startingPosition } from "../src/chess/history";
import { OPERA_PGN } from "./fixtures";

describe("startingPosition", () => {
  it("is the standard start position for a game played from the standard setup", () => {
    expect(startingPosition(OPERA_PGN)).toBe(FEN.start);
  });

  it("throws on an unparseable PGN rather than returning a wrong position", () => {
    expect(() => startingPosition("this is not a pgn 1. zz99")).toThrow();
  });
});
