import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fenStringToPositionObject } from "react-chessboard";
import { Board } from "../src/components/Board";
import { startingPosition } from "../src/chess/history";
import { OPERA_PGN } from "./fixtures";
import type { MoveAnnotation } from "../src/types";

function pieceAt(container: HTMLElement, square: string): string | null {
  const piece = container.querySelector(`[data-square="${square}"] [data-piece]`);
  return piece?.getAttribute("data-piece") ?? null;
}

function squareBackground(container: HTMLElement, square: string): string {
  const squareDiv = container.querySelector<HTMLElement>(`[data-square="${square}"] > div`);
  return squareDiv?.style.backgroundColor ?? "";
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
    expect(screen.getByLabelText("current move").textContent).toBe("e4");
  });

  it("reverts exactly one Move on Previous (not back to the start)", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn={OPERA_PGN} />);
    const next = screen.getByRole("button", { name: /next/i });

    await user.click(next); // 1. e4
    await user.click(next); // 1... e5
    await user.click(screen.getByRole("button", { name: /previous/i })); // back to 1. e4

    expect(screen.getByLabelText("current move").textContent).toBe("e4");
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
    expect(screen.getByLabelText("current move").textContent).toMatch(/^Rd8/);
  });

  it("jumps directly to the Position after a selected Move, without stepping through", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn={OPERA_PGN} />);

    // From the start, jump straight to White's 12th Move (queenside castling).
    await user.click(screen.getByRole("button", { name: "O-O-O" }));

    expect(screen.getByLabelText("current move").textContent).toBe("O-O-O");
    expect(pieceAt(container, "c1")).toBe("wK");
    expect(pieceAt(container, "d1")).toBe("wR");
    expect(pieceAt(container, "e1")).toBeNull();
  });

  it("continues stepping correctly from a jumped-to Position", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn={OPERA_PGN} />);
    await user.click(screen.getByRole("button", { name: "O-O-O" }));

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByLabelText("current move").textContent).toBe("Rd8");
    expect(pieceAt(container, "d8")).toBe("bR");
  });

  it("shows a severity glyph only next to the Player's own flawed Move, and the Evaluation for both sides", () => {
    // "1. e4 e5": ply 1 is White's Move (e4, flagged a blunder here), ply 2 is
    // Black's reply (e5, never flagged regardless of its own Evaluation).
    const annotations: MoveAnnotation[] = [
      { ply: 0, whiteEval: { cp: 25, mate: null }, whiteWinChances: 55, severity: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder" },
      { ply: 2, whiteEval: { cp: -380, mate: null }, whiteWinChances: 6, severity: null },
    ];
    render(<Board pgn="1. e4 e5" annotations={annotations} />);

    const items = screen.getAllByRole("listitem");

    expect(items[0].textContent).toContain("??"); // e4: blunder glyph present
    expect(items[0].textContent).toContain("-4.0"); // e4: White-relative Evaluation
    expect(items[1].textContent).not.toContain("?"); // e5: no glyph, even though it dropped chances
    expect(items[1].textContent).toContain("-3.8"); // e5: Evaluation still shown
  });

  it("shows the current Position's formatted Evaluation next to the status line, updating on navigation", async () => {
    const annotations: MoveAnnotation[] = [
      { ply: 0, whiteEval: { cp: 25, mate: null }, whiteWinChances: 55, severity: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder" },
    ];
    const user = userEvent.setup();
    render(<Board pgn="1. e4" annotations={annotations} />);

    expect(screen.getByLabelText("current move").textContent).toContain("+0.3");

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByLabelText("current move").textContent).toContain("-4.0");
  });

  it("renders a winning-chances balance bar for the current Position, updating on navigation", async () => {
    const annotations: MoveAnnotation[] = [
      { ply: 0, whiteEval: { cp: 25, mate: null }, whiteWinChances: 55, severity: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder" },
    ];
    const user = userEvent.setup();
    render(<Board pgn="1. e4" annotations={annotations} />);

    expect(screen.getByRole("img", { name: /55/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByRole("img", { name: /blancs 5%/i })).toBeTruthy();
  });

  it("tints the destination square of the current Position's flawed Move, distinctly per severity", async () => {
    const annotations: MoveAnnotation[] = [
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder" },
      { ply: 2, whiteEval: { cp: -50, mate: null }, whiteWinChances: 45, severity: "inaccuracy" },
    ];
    const user = userEvent.setup();
    const { container } = render(<Board pgn="1. e4 e5" annotations={annotations} />);
    const next = screen.getByRole("button", { name: /next/i });

    await user.click(next); // Position after e4 (blunder)
    const e4Tint = squareBackground(container, "e4");
    expect(e4Tint).toBeTruthy();

    await user.click(next); // Position after e5 (inaccuracy)
    const e5Tint = squareBackground(container, "e5");
    expect(e5Tint).toBeTruthy();
    expect(e5Tint).not.toBe(e4Tint);
    expect(squareBackground(container, "e4")).not.toBeTruthy(); // no longer the current Position
  });

  it("tints no square when the current Position follows a clean Move, an opponent's Move, or is the start", async () => {
    const annotations: MoveAnnotation[] = [
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null },
      { ply: 1, whiteEval: { cp: 10, mate: null }, whiteWinChances: 52, severity: null }, // clean
      { ply: 2, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: null }, // opponent's Move, never flagged
    ];
    const user = userEvent.setup();
    const { container } = render(<Board pgn="1. e4 e5" annotations={annotations} />);

    expect(squareBackground(container, "e2")).not.toBeTruthy(); // start Position

    const next = screen.getByRole("button", { name: /next/i });
    await user.click(next);
    expect(squareBackground(container, "e4")).not.toBeTruthy(); // clean Move

    await user.click(next);
    expect(squareBackground(container, "e5")).not.toBeTruthy(); // opponent's Move
  });

  it("resolves a special Move (promotion) correctly when jumped to directly", async () => {
    const user = userEvent.setup();
    const promoPgn = "1. a4 b5 2. axb5 a6 3. bxa6 c6 4. a7 c5 5. axb8=Q";
    const { container } = render(<Board pgn={promoPgn} />);

    await user.click(screen.getByRole("button", { name: "axb8=Q" }));

    expect(screen.getByLabelText("current move").textContent).toBe("axb8=Q");
    expect(pieceAt(container, "b8")).toBe("wQ");
  });
});

describe("Evaluation curve", () => {
  /**
   * The curve is `aria-hidden` on purpose (US-14: every figure it carries is
   * already text in this component), so it is reached through the container —
   * the same way the square tints above are. No role or label is added for the
   * benefit of tests.
   */
  function curve(container: HTMLElement): SVGElement | null {
    return container.querySelector<SVGElement>("svg[aria-hidden='true']");
  }

  /** The current-Move mark: the full-height vertical line, as opposed to the equality line. */
  function cursorX(container: HTMLElement): number | null {
    const lines = [...container.querySelectorAll<SVGLineElement>("svg[aria-hidden='true'] line")];
    const cursor = lines.find(
      (l) => l.getAttribute("x1") === l.getAttribute("x2") && l.getAttribute("y2") === "100",
    );
    return cursor ? Number(cursor.getAttribute("x1")) : null;
  }

  const three: MoveAnnotation[] = [
    { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null },
    { ply: 1, whiteEval: { cp: 25, mate: null }, whiteWinChances: 55, severity: null },
    { ply: 2, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder" },
  ];

  it("draws the Game's curve beside the board once the Game has Evaluations", () => {
    const { container } = render(<Board pgn="1. e4 e5" annotations={three} />);

    expect(curve(container)).toBeTruthy();
  });

  it("holds the board and the annotations as two named panes of one row", () => {
    const { container } = render(<Board pgn="1. e4 e5" annotations={three} />);

    const row = container.querySelector('[data-row="board"]')!;
    const board = row.querySelector('[data-pane="board"]')!;
    const annotations = row.querySelector('[data-pane="annotations"]')!;

    expect(board).toBeTruthy();
    expect(annotations).toBeTruthy();
    // Named panes rather than anonymous divs sized in pixels: the row can later
    // be laid out — and reflowed into one column — without touching the board.
    expect(annotations.contains(curve(container)!)).toBe(true);
  });

  it("keeps the board's pane when the annotations pane goes away", () => {
    const { container } = render(<Board pgn="1. e4 e5" />);

    const row = container.querySelector('[data-row="board"]')!;
    expect(row.querySelector('[data-pane="board"]')).toBeTruthy();
    expect(row.querySelector('[data-pane="annotations"]')).toBeNull();
  });

  it("draws no curve for a Game with no Evaluations, or with the annotations hidden", () => {
    const { container } = render(<Board pgn="1. e4 e5" />);

    expect(curve(container)).toBeNull();
  });

  it("marks the current Move, starting at the leftmost point and following navigation", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn="1. e4 e5" annotations={three} />);

    expect(cursorX(container)).toBe(0); // the starting Position, leftmost

    await user.click(screen.getByRole("button", { name: /next/i }));
    const afterFirst = cursorX(container)!;
    expect(afterFirst).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(cursorX(container)!).toBeGreaterThan(afterFirst);

    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(cursorX(container)).toBe(afterFirst);
  });

  it("marks the Move jumped to directly, not just the one stepped to", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn="1. e4 e5" annotations={three} />);

    await user.click(screen.getByRole("button", { name: "e5" }));

    expect(cursorX(container)).toBe(2);
  });

  it("marks the Player's own flawed Moves on the curve, by glyph and not by colour alone", () => {
    const { container } = render(<Board pgn="1. e4 e5" annotations={three} />);

    // Over the drawing rather than inside it: the curve's box scales x and y by
    // different factors, which smears a glyph drawn in SVG coordinates.
    const glyphs = [...container.querySelectorAll("div[aria-hidden='true'] > span")].map(
      (t) => t.textContent,
    );

    // ply 1 is the Player's blunder; ply 2 is the opponent's reply, never flagged.
    expect(glyphs).toEqual(["??"]);
  });

  it("counts the Player's own errors in text, said to be theirs", () => {
    render(<Board pgn="1. e4 e5" annotations={three} />);

    const tally = screen.getByLabelText(/vos erreurs/i);
    expect(tally.textContent).toContain("??");
    expect(tally.textContent).toMatch(/\b1\b/);
  });

  it("says so in text when the Player made no flawed Move, rather than showing nothing", () => {
    const clean: MoveAnnotation[] = [
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null },
      { ply: 1, whiteEval: { cp: 20, mate: null }, whiteWinChances: 53, severity: null },
    ];
    render(<Board pgn="1. e4" annotations={clean} />);

    expect(screen.getByLabelText(/vos erreurs/i).textContent).toMatch(/aucune/i);
  });

  it("drops the markers and the count along with the curve when annotations are hidden", () => {
    render(<Board pgn="1. e4 e5" />);

    expect(screen.queryByLabelText(/vos erreurs/i)).toBeNull();
  });

  it("stays out of the accessibility tree, adding no second image or live region", () => {
    const { container } = render(<Board pgn="1. e4 e5" annotations={three} />);

    expect(curve(container)!.getAttribute("aria-hidden")).toBe("true");
    // The advantage bar remains the only image in this component.
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });
});

describe("Board orientation", () => {
  /** The squares in the order they are laid out — first is the top-left corner of the board. */
  function squareOrder(container: HTMLElement): string[] {
    return [...container.querySelectorAll("[data-square]")].map(
      (el) => el.getAttribute("data-square")!,
    );
  }

  it("shows White at the bottom when given no orientation — the Explorer's board is untouched", () => {
    const { container } = render(<Board pgn={OPERA_PGN} />);

    const squares = squareOrder(container);
    expect(squares[0]).toBe("a8");
    expect(squares[squares.length - 1]).toBe("h1");
  });

  it("shows Black at the bottom when oriented to Black", () => {
    const { container } = render(<Board pgn={OPERA_PGN} orientation="black" />);

    const squares = squareOrder(container);
    expect(squares[0]).toBe("h1");
    expect(squares[squares.length - 1]).toBe("a8");
  });

  it("still puts the right piece on the right square once flipped", () => {
    const { container } = render(<Board pgn={OPERA_PGN} orientation="black" />);

    // Orientation turns the board, it does not move the pieces.
    expect(pieceAt(container, "e1")).toBe("wK");
    expect(pieceAt(container, "e8")).toBe("bK");
  });
});

describe("the error tally's wording", () => {
  function annotationsWith(severities: MoveAnnotation["severity"][]): MoveAnnotation[] {
    return [
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null },
      ...severities.map((severity, i) => ({
        ply: i + 1,
        whiteEval: { cp: -100, mate: null },
        whiteWinChances: 40,
        severity,
      })),
    ];
  }

  it("agrees in number — one flaw is not counted in the plural", () => {
    render(<Board pgn="1. e4 e5 2. Nf3" annotations={annotationsWith(["inaccuracy", null, "blunder"])} />);

    const tally = screen.getByLabelText(/vos erreurs/i).textContent!;
    expect(tally).toContain("1 imprécision ?!");
    expect(tally).not.toContain("imprécisions");
    expect(tally).toContain("1 grosse erreur ??");
  });
});
