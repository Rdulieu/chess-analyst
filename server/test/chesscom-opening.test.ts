import { describe, it, expect } from "vitest";
import { parseOpening } from "../src/platform/chesscom/opening";

describe("parseOpening", () => {
  it("reads the ECO code and derives a readable name from the ECOUrl slug", () => {
    const pgn = [
      '[ECO "B22"]',
      '[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Alapin-Variation"]',
      "",
      "1. e4 c5 2. c3",
    ].join("\n");

    expect(parseOpening(pgn)).toEqual({
      eco: "B22",
      openingName: "Sicilian Defense Alapin Variation",
    });
  });

  it("falls back to the Other opening when chess.com did not classify the Game", () => {
    // A PGN with headers but no [ECO] (e.g. Morphy's Opera Game / an aborted game).
    const noEco = ['[White "Paul Morphy"]', '[Result "1-0"]', "", "1. e4 e5 2. Nf3"].join("\n");
    expect(parseOpening(noEco)).toEqual({ eco: "other", openingName: "Autre / non classée" });

    // Bare move list (no headers at all).
    expect(parseOpening("1. d4 d5")).toEqual({ eco: "other", openingName: "Autre / non classée" });
  });

  it("keeps the ECO code as the name when the ECOUrl header is absent", () => {
    expect(parseOpening('[ECO "C50"]\n\n1. e4 e5')).toEqual({ eco: "C50", openingName: "C50" });
  });
});
