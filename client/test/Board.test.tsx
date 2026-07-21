import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fenStringToPositionObject } from "react-chessboard";
import { Board } from "../src/components/Board";
import { startingPosition } from "../src/chess/history";
import { OPERA_PGN } from "./fixtures";

function pieceAt(container: HTMLElement, square: string): string | null {
  const piece = container.querySelector(`[data-square="${square}"] [data-piece]`);
  return piece?.getAttribute("data-piece") ?? null;
}

describe("Board", () => {
  it("renders the Game's starting position — the right piece on every occupied square", () => {
    const { container } = render(<Board pgn={OPERA_PGN} />);

    const expected = Object.entries(fenStringToPositionObject(startingPosition(OPERA_PGN), 8, 8));
    expect(expected).toHaveLength(32);

    for (const [square, { pieceType }] of expected) {
      const piece = container.querySelector(`[data-square="${square}"] [data-piece]`);
      expect(piece?.getAttribute("data-piece"), `piece on ${square}`).toBe(pieceType);
    }
  });

  it("advances exactly one Move on Next, showing the resulting position and its SAN", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn={OPERA_PGN} />);

    await user.click(screen.getByRole("button", { name: /next/i }));

    // After 1. e4 the pawn has moved from e2 to e4.
    expect(pieceAt(container, "e2")).toBeNull();
    expect(pieceAt(container, "e4")).toBe("wP");
    expect(screen.getByRole("status", { name: "current move" }).textContent).toBe("e4");
  });

  it("reverts exactly one Move on Previous (not back to the start)", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn={OPERA_PGN} />);
    const next = screen.getByRole("button", { name: /next/i });

    await user.click(next); // 1. e4
    await user.click(next); // 1... e5
    await user.click(screen.getByRole("button", { name: /previous/i })); // back to 1. e4

    expect(screen.getByRole("status", { name: "current move" }).textContent).toBe("e4");
    expect(pieceAt(container, "e4")).toBe("wP");
    expect(pieceAt(container, "e5")).toBeNull(); // black has not replied yet
  });

  it("cannot revert before the start nor advance past the last Move", async () => {
    const user = userEvent.setup();
    render(<Board pgn={OPERA_PGN} />);
    const prev = screen.getByRole("button", { name: /previous/i }) as HTMLButtonElement;
    const next = screen.getByRole("button", { name: /next/i }) as HTMLButtonElement;

    // At the start: cannot go back.
    expect(prev.disabled).toBe(true);
    expect(next.disabled).toBe(false);

    // Advance through all 33 half-moves to the end.
    for (let i = 0; i < 33; i++) await user.click(next);

    expect(next.disabled).toBe(true);
    expect(prev.disabled).toBe(false);
    expect(screen.getByRole("status", { name: "current move" }).textContent).toMatch(/^Rd8/);
  });

  it("jumps directly to the Position after a selected Move, without stepping through", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn={OPERA_PGN} />);

    // From the start, jump straight to White's 12th Move (queenside castling).
    await user.click(screen.getByRole("button", { name: "O-O-O" }));

    expect(screen.getByRole("status", { name: "current move" }).textContent).toBe("O-O-O");
    expect(pieceAt(container, "c1")).toBe("wK");
    expect(pieceAt(container, "d1")).toBe("wR");
    expect(pieceAt(container, "e1")).toBeNull();
  });

  it("continues stepping correctly from a jumped-to Position", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn={OPERA_PGN} />);
    await user.click(screen.getByRole("button", { name: "O-O-O" }));

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByRole("status", { name: "current move" }).textContent).toBe("Rd8");
    expect(pieceAt(container, "d8")).toBe("bR");
  });

  it("resolves a special Move (promotion) correctly when jumped to directly", async () => {
    const user = userEvent.setup();
    const promoPgn = "1. a4 b5 2. axb5 a6 3. bxa6 c6 4. a7 c5 5. axb8=Q";
    const { container } = render(<Board pgn={promoPgn} />);

    await user.click(screen.getByRole("button", { name: "axb8=Q" }));

    expect(screen.getByRole("status", { name: "current move" }).textContent).toBe("axb8=Q");
    expect(pieceAt(container, "b8")).toBe("wQ");
  });
});
