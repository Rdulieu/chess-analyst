import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { BOARD_SQUARES } from "../src/chess/boardTheme";

/**
 * The board's own colours. `--square-light` / `--square-dark` were declared with
 * the frozen token set and consumed by nobody: the three boards still rendered
 * react-chessboard's own `#F0D9B5` / `#B58863`, so two tokens were a claim about
 * the palette that the app did not honour. This is where they start being true.
 */
describe("the board's squares", () => {
  it("names its colours as tokens, never as colours", () => {
    // A third-party prop taking a style object cannot be reached by a class,
    // which is the reason the tokens are custom properties at all (ADR-0013).
    expect(BOARD_SQUARES).toEqual({
      lightSquareStyle: { backgroundColor: "var(--square-light)" },
      darkSquareStyle: { backgroundColor: "var(--square-dark)" },
      lightSquareNotationStyle: { color: "var(--square-notation)" },
      darkSquareNotationStyle: { color: "var(--square-notation)" },
    });
  });

  it("gives both squares the SAME notation ink", () => {
    // react-chessboard labels each square in the other square's colour, which is
    // 2.29:1 — a coordinate is text on a drawing and has to be readable on both.
    expect(BOARD_SQUARES.lightSquareNotationStyle).toEqual(
      BOARD_SQUARES.darkSquareNotationStyle,
    );
  });

  it.each([
    "components/Board.tsx",
    "pages/DangerPage.tsx",
    "pages/ExplorerPage.tsx",
  ])("is what %s draws, so no board can drift from another", (path) => {
    const source = readFileSync(resolve(import.meta.dirname, "../src", path), "utf8");
    expect(source).toContain("...BOARD_SQUARES");
  });
});
