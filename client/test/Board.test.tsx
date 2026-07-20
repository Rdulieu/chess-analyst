import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { fenStringToPositionObject } from "react-chessboard";
import { Board } from "../src/components/Board";
import { startingPosition } from "../src/chess/history";
import { OPERA_PGN } from "./fixtures";

describe("Board", () => {
  it("renders the Game's starting position — the right piece on every occupied square", () => {
    const { container } = render(<Board pgn={OPERA_PGN} />);

    // Expected position derived from the PGN's starting FEN via react-chessboard's
    // own helper, so the test asserts the full board, not a hand-picked few squares.
    const expected = Object.entries(fenStringToPositionObject(startingPosition(OPERA_PGN), 8, 8));
    expect(expected).toHaveLength(32);

    for (const [square, { pieceType }] of expected) {
      const piece = container.querySelector(`[data-square="${square}"] [data-piece]`);
      expect(piece?.getAttribute("data-piece"), `piece on ${square}`).toBe(pieceType);
    }
  });
});
