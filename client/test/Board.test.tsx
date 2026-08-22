import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
      { ply: 0, whiteEval: { cp: 25, mate: null }, whiteWinChances: 55, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: [], phase: "early", counted: null, chancesLost: null },
      { ply: 2, whiteEval: { cp: -380, mate: null }, whiteWinChances: 6, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
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
      { ply: 0, whiteEval: { cp: 25, mate: null }, whiteWinChances: 55, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: [], phase: "early", counted: null, chancesLost: null },
    ];
    const user = userEvent.setup();
    render(<Board pgn="1. e4" annotations={annotations} />);

    expect(screen.getByLabelText("current move").textContent).toContain("+0.3");

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByLabelText("current move").textContent).toContain("-4.0");
  });

  it("renders a winning-chances balance bar for the current Position, updating on navigation", async () => {
    const annotations: MoveAnnotation[] = [
      { ply: 0, whiteEval: { cp: 25, mate: null }, whiteWinChances: 55, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: [], phase: "early", counted: null, chancesLost: null },
    ];
    const user = userEvent.setup();
    render(<Board pgn="1. e4" annotations={annotations} />);

    expect(screen.getByRole("img", { name: /55/ })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByRole("img", { name: /blancs 5%/i })).toBeTruthy();
  });

  it("tints the destination square of the current Position's flawed Move, distinctly per severity", async () => {
    const annotations: MoveAnnotation[] = [
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: [], phase: "early", counted: null, chancesLost: null },
      { ply: 2, whiteEval: { cp: -50, mate: null }, whiteWinChances: 45, severity: "inaccuracy", bestLine: [], phase: "early", counted: null, chancesLost: null },
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

  it("takes the square's tint from the CONSTANT family, and the move list's from the chrome's", async () => {
    // jsdom never loads the stylesheet, so the honest assertion is the token
    // NAME: it verifies the wiring, which is what can break, rather than a hue
    // that was judged once on the pilot (ADR-0013).
    const annotations: MoveAnnotation[] = [
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: [], phase: "early", counted: null, chancesLost: null },
    ];
    const user = userEvent.setup();
    const { container } = render(<Board pgn="1. e4" annotations={annotations} />);

    await user.click(screen.getByRole("button", { name: /next/i }));

    // The square: a piece is painted on it, and the piece's ink is constant.
    expect(squareBackground(container, "e4")).toBe("var(--square-blunder)");

    // The move list's glyph: chrome, so it follows the theme — styled from the
    // sheet on the severity the element names, with its own ink token.
    const glyph = container.querySelector('ol[aria-label="moves"] [data-severity]');
    expect(glyph?.getAttribute("data-severity")).toBe("blunder");
    expect(glyph?.textContent).toBe("??");
  });

  it("tints no square when the current Position follows a clean Move, an opponent's Move, or is the start", async () => {
    const annotations: MoveAnnotation[] = [
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
      { ply: 1, whiteEval: { cp: 10, mate: null }, whiteWinChances: 52, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null }, // clean
      { ply: 2, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null }, // opponent's Move, never flagged
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
    { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
    { ply: 1, whiteEval: { cp: 25, mate: null }, whiteWinChances: 55, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
    { ply: 2, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: [], phase: "early", counted: null, chancesLost: null },
  ];

  it("draws the Game's curve beside the board once the Game has Evaluations", () => {
    const { container } = render(<Board pgn="1. e4 e5" annotations={three} />);

    expect(curve(container)).toBeTruthy();
  });

  it("holds the board and everything read beside it as two named panes of one row", () => {
    const { container } = render(<Board pgn="1. e4 e5" annotations={three} />);

    const row = container.querySelector('[data-row="board"]')!;
    const board = row.querySelector('[data-pane="board"]')!;
    const side = row.querySelector('[data-pane="side"]')!;

    expect(board).toBeTruthy();
    expect(side).toBeTruthy();
    // The curve and the move list are read BESIDE the board, not stacked under
    // it: on a wide screen the move list used to start below the fold, behind the
    // whole height of the diagram.
    expect(side.contains(curve(container)!)).toBe(true);
    expect(side.contains(screen.getByRole("list", { name: "moves" }))).toBe(true);
  });

  it("keeps the winning-chances bar inside the board's pane, so it is the board's own gauge", () => {
    const { container } = render(<Board pgn="1. e4 e5" annotations={three} />);

    const boardPane = container.querySelector('[data-pane="board"]')!;
    const bar = container.querySelector('[data-bar="winning-chances"]')!;

    expect(boardPane.contains(bar)).toBe(true);
    // Under the board and not over it: the bar comes and goes with the
    // annotations, and nothing above the board may move when it does.
    const diagram = boardPane.querySelector("[data-square]")!;
    expect(diagram.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps both panes when the annotations go away — only the annotations do", () => {
    const { container } = render(<Board pgn="1. e4 e5" />);

    const row = container.querySelector('[data-row="board"]')!;
    const side = row.querySelector('[data-pane="side"]')!;

    expect(row.querySelector('[data-pane="board"]')).toBeTruthy();
    // The side pane survives, because the move list is not an annotation: it is
    // there for every Game, analysed or not.
    expect(side).toBeTruthy();
    expect(side.contains(screen.getByRole("list", { name: "moves" }))).toBe(true);
    expect(curve(container)).toBeNull();
    expect(container.querySelector('[data-bar="winning-chances"]')).toBeNull();
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

  it("gives each marker its severity's own tint-and-ink pair", () => {
    const { container } = render(<Board pgn="1. e4 e5" annotations={three} />);

    // The curve's two grounds — White's share and Black's — moved out of this
    // component and into the stylesheet with US-13's dense-screens slice, since a
    // ground is a declaration a selector can hold. They are asserted where they
    // now live: `denseScreens.test.ts`, on the compiled sheet. What stays inline,
    // and stays asserted here, is what the DATA computes.

    // A marker carries the chrome tint AND its own ink — the pair, never the
    // tint alone, so its legibility does not depend on the inherited `--ink`
    // nor on the constant ground it happens to sit over.
    const marker = container.querySelector<HTMLElement>("div[aria-hidden='true'] > span")!;
    expect(marker.textContent).toBe("??");
    expect(marker.style.background).toBe("var(--tint-blunder)");
    expect(marker.style.color).toBe("var(--tint-blunder-ink)");
  });

  it("counts the Player's own errors in text, said to be theirs", () => {
    render(<Board pgn="1. e4 e5" annotations={three} />);

    const tally = screen.getByLabelText(/vos erreurs/i);
    expect(tally.textContent).toContain("??");
    expect(tally.textContent).toMatch(/\b1\b/);
  });

  it("says so in text when the Player made no flawed Move, rather than showing nothing", () => {
    const clean: MoveAnnotation[] = [
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
      { ply: 1, whiteEval: { cp: 20, mate: null }, whiteWinChances: 53, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
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
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
      ...severities.map((severity, i) => ({
        ply: i + 1,
        whiteEval: { cp: -100, mate: null },
        whiteWinChances: 40,
        severity,
        bestLine: [],
        phase: "early" as const,
        counted: null,
        chancesLost: null,
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

describe("Board — where the Phases begin", () => {
  /** "1. e4 e5 2. Nf3" with a boundary contrived at each of the two Moves. */
  const withPhases = (...phases: MoveAnnotation["phase"][]): MoveAnnotation[] =>
    phases.map((phase, ply) => ({
      counted: null,
      chancesLost: null,
      ply,
      whiteEval: { cp: 0, mate: null },
      whiteWinChances: 50,
      severity: null,
      bestLine: [],
      phase,
    }));

  it("marks where each Phase begins IN the move list, in words rather than by a tint", () => {
    render(
      <Board pgn="1. e4 e5 2. Nf3" annotations={withPhases("early", "early", "middlegame", "endgame")} />,
    );

    const marks = within(screen.getByRole("list", { name: "moves" })).getAllByRole("listitem")
      .filter((item) => item.dataset.part === "phase-start");
    expect(marks.map((mark) => mark.textContent)).toEqual([
      "Début du milieu de partie",
      "Début de la finale",
    ]);
  });

  it("puts each mark just before the Move that opens the Phase, which is what makes it scannable", () => {
    render(
      <Board pgn="1. e4 e5 2. Nf3" annotations={withPhases("early", "early", "middlegame", "middlegame")} />,
    );

    const items = within(screen.getByRole("list", { name: "moves" })).getAllByRole("listitem");
    // e4, then the mark, then e5 — the Move whose Position is the first of the Phase.
    expect(items[0].textContent).toContain("e4");
    expect(items[1].dataset.part).toBe("phase-start");
    expect(items[2].textContent).toContain("e5");
  });

  it("marks nothing on a Game that never leaves the start", () => {
    render(<Board pgn="1. e4 e5 2. Nf3" annotations={withPhases("early", "early", "early", "early")} />);

    const items = within(screen.getByRole("list", { name: "moves" })).getAllByRole("listitem");
    expect(items.filter((item) => item.dataset.part === "phase-start")).toHaveLength(0);
  });
});

describe("Board — the Moves that do not count", () => {
  const annotated = (
    severity: MoveAnnotation["severity"],
    counted: MoveAnnotation["counted"],
  ): MoveAnnotation[] => [
    { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [], phase: "middlegame", counted: null, chancesLost: null },
    { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 10, severity, bestLine: [], phase: "middlegame", counted, chancesLost: 0 },
    { ply: 2, whiteEval: { cp: -400, mate: null }, whiteWinChances: 10, severity: null, bestLine: [], phase: "middlegame", counted: null, chancesLost: null },
  ];

  const firstMove = () =>
    within(screen.getByRole("list", { name: "moves" })).getAllByRole("listitem")[0];

  it("marks a flawed Move the analysis does not hold the Player to — in text, beside the glyph", () => {
    render(<Board pgn="1. e4 e5" annotations={annotated("blunder", { counted: false, reason: "forced" })} />);

    // The glyph still carries the fault; the mark says the analysis excludes it.
    expect(within(firstMove()).getByLabelText("blunder")).toBeTruthy();
    // The mark names its REASON: by construction it can only be a forced Move,
    // and "non compté" alone would say strictly less on the scanning surface.
    expect(within(firstMove()).getByLabelText(/coup forcé, non compté/i).textContent).toBe("forcé");
  });

  it("leaves an uncounted Move that carries no severity unmarked, so a lost Game grows no trail of marks", () => {
    render(<Board pgn="1. e4 e5" annotations={annotated(null, { counted: false, reason: "decided" })} />);

    expect(within(firstMove()).queryByLabelText(/non compté/i)).toBeNull();
  });

  it("marks nothing on a Move that counts", () => {
    render(<Board pgn="1. e4 e5" annotations={annotated("blunder", { counted: true, reason: null })} />);

    expect(within(firstMove()).queryByLabelText(/non compté/i)).toBeNull();
  });
});

describe("Board — the second drawing", () => {
  const game = (...lost: (number | null)[]): MoveAnnotation[] =>
    lost.map((chancesLost, ply) => ({
      ply,
      whiteEval: { cp: 0, mate: null },
      whiteWinChances: 50,
      severity: null,
      bestLine: [],
      phase: ply < 2 ? ("early" as const) : ("endgame" as const),
      counted: chancesLost === null ? null : { counted: true, reason: null },
      chancesLost,
    }));

  const boxes = (container: HTMLElement) => ({
    curve: container.querySelector('[data-part="curve"]'),
    drift: container.querySelector('[data-part="drift"]'),
  });

  it("draws its OWN picture rather than a second series on the curve", () => {
    const { container } = render(
      <Board pgn="1. e4 e5 2. Nf3" annotations={game(null, 5, null, 30)} detailed />,
    );

    const { curve, drift } = boxes(container);
    // Two boxes, two svgs: one axis shared, never one drawing carrying two
    // different quantities (the US-14 condition).
    expect(curve).not.toBeNull();
    expect(drift).not.toBeNull();
    expect(curve!.contains(drift!)).toBe(false);
  });

  it("labels BOTH drawings visibly, so two pictures that differ cannot be confused", () => {
    render(<Board pgn="1. e4 e5 2. Nf3" annotations={game(null, 5, null, 30)} detailed />);

    expect(screen.getByText(/avantage au fil de la partie/i)).toBeTruthy();
    expect(screen.getByText(/chances perdues/i)).toBeTruthy();
  });

  it("hides the drawing from the reader, whose figures live in the recap's text", () => {
    const { container } = render(
      <Board pgn="1. e4 e5 2. Nf3" annotations={game(null, 5, null, 30)} detailed />,
    );

    expect(boxes(container).drift!.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("names the Phases in real text on the shared axis, between the two drawings", () => {
    const { container } = render(
      <Board pgn="1. e4 e5 2. Nf3" annotations={game(null, 5, null, 30)} detailed />,
    );

    const ribbon = screen.getByLabelText("phases de la partie");
    // The ribbon's own shorter names: a band is only as wide as its Phase's share
    // of the Game, and "Milieu de pa…" names less than "Milieu".
    expect(ribbon.textContent).toContain("Début");
    expect(ribbon.textContent).toContain("Finale");
    // Between them: after the curve, before the trace.
    const { curve, drift } = boxes(container);
    expect(curve!.compareDocumentPosition(ribbon)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(ribbon.compareDocumentPosition(drift!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("rules the boundaries OVER both drawings, and paints no background band", () => {
    const { container } = render(
      <Board pgn="1. e4 e5 2. Nf3" annotations={game(null, 5, null, 30)} detailed />,
    );

    const { curve, drift } = boxes(container);
    for (const box of [curve!, drift!]) {
      const rules = box.querySelectorAll('[data-mark="phase-boundary"]');
      expect(rules).toHaveLength(1); // one boundary in this Game
      // A line, drawn after the area: over it, not behind it.
      expect(rules[0].tagName.toLowerCase()).toBe("line");
      expect(box.querySelectorAll("rect")).toHaveLength(0);
    }
  });

  it("keeps the second drawing out of Annotated, where its figures exist in no text", () => {
    const { container } = render(<Board pgn="1. e4 e5 2. Nf3" annotations={game(null, 5, null, 30)} />);

    expect(boxes(container).curve).not.toBeNull();
    expect(boxes(container).drift).toBeNull();
    expect(screen.queryByLabelText("phases de la partie")).toBeNull();
  });
});

describe("Board — the Game's recap", () => {
  const RECAP = {
    playerMoves: 10,
    countedMoves: 8,
    excluded: { forced: 1, decided: 1 },
    flaggedMoves: 2,
    countedErrors: 1,
    chancesLost: 30,
    flaggedLoss: 20,
    drift: 10,
    regime: { depth: 16, lines: 2 },
  };
  const annotated: MoveAnnotation[] = [
    { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
    { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: [], phase: "early", counted: { counted: true, reason: null }, chancesLost: 0 },
  ];

  it("reads at the HEAD of the panel: it is the claim, and everything below it is the proof", () => {
    render(<Board pgn="1. e4 e5" annotations={annotated} detailed recap={RECAP} />);

    const recap = screen.getByRole("region", { name: /ce que cette partie apporte/i });
    const move = screen.getByRole("region", { name: /relevé/i });
    expect(recap.compareDocumentPosition(move)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("shows the error tally ONCE in Detailed — inside the recap, not beside it", () => {
    render(<Board pgn="1. e4 e5" annotations={annotated} detailed recap={RECAP} />);

    // Two correct counts disagreeing side by side read as a bug; the recap is the
    // one that also states why they can differ.
    expect(screen.queryByLabelText("vos erreurs")).toBeNull();
    expect(screen.getByRole("region", { name: /ce que cette partie apporte/i })).toBeTruthy();
  });

  it("leaves the tally exactly where US-14 put it in Annotated, and shows no recap there", () => {
    render(<Board pgn="1. e4 e5" annotations={annotated} recap={RECAP} />);

    expect(screen.getByLabelText("vos erreurs")).toBeTruthy();
    expect(screen.queryByRole("region", { name: /ce que cette partie apporte/i })).toBeNull();
  });
});

describe("Board — the reviewed Move's record", () => {
  /** "1. e4 e5" annotated so that White's e4 is a Blunder. Ply 0's line is what
   *  should have been played instead; ply 1's line — from the Position *after*
   *  e4 — is how e4 is punished (CONTEXT.md, `Best line`). */
  const annotations: MoveAnnotation[] = [
    {
      ply: 0,
      whiteEval: { cp: 25, mate: null },
      whiteWinChances: 55,
      severity: null,
      bestLine: ["d2d4", "d7d5"],
      phase: "early",
      counted: null,
      chancesLost: null,    },
    {
      ply: 1,
      whiteEval: { cp: -400, mate: null },
      whiteWinChances: 5,
      severity: "blunder",
      bestLine: ["e7e5", "g1f3"],
      phase: "early",
      counted: null,
      chancesLost: null,    },
    {
      ply: 2,
      whiteEval: { cp: -380, mate: null },
      whiteWinChances: 6,
      severity: null,
      bestLine: ["g1f3", "b8c6"],
      phase: "early",
      counted: null,
      chancesLost: null,    },
  ];

  const record = () => screen.getByRole("region", { name: /relevé/i });

  it("names what should have been played, and its continuation, for the Move being reviewed", async () => {
    const user = userEvent.setup();
    render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i })); // e4, a Blunder

    // The line of the Position *before* the Move: d4, then its continuation —
    // the point being to understand *why* it was better, not just that it was.
    const best = within(record()).getByRole("group", { name: /il fallait jouer/i });
    expect(within(best).getAllByRole("button").map((b) => b.textContent)).toEqual(["d4", "d5"]);
  });

  it("shows how the Move played is punished — the opponent's best reply and its continuation", async () => {
    const user = userEvent.setup();
    render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i }));

    const refutation = within(record()).getByRole("group", { name: /réfutation/i });
    expect(within(refutation).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "e5",
      "Nf3",
    ]);
  });

  it("says a line continues past what it shows, rather than passing six plies off as the whole line", async () => {
    const user = userEvent.setup();
    const long: MoveAnnotation[] = [
      {
        ...annotations[0],
        // Nine plies of a real line from the starting Position: more than the
        // display cap, which is exactly the case the engine produces at depth 16.
        bestLine: ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3", "g8f6", "c1g5", "f8e7", "e2e3"],
        phase: "early",
        counted: null,
        chancesLost: null,      },
      annotations[1],
      annotations[2],
    ];
    render(<Board pgn="1. e4 e5" annotations={long} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i }));

    const best = within(record()).getByRole("group", { name: /il fallait jouer/i });
    expect(within(best).getAllByRole("button")).toHaveLength(6);
    // In text, not as a bare ellipsis: the count is the honest statement, and it
    // is what a screen reader reads out.
    expect(best.textContent).toMatch(/3 coups de plus/i);
  });

  it("says there is nothing to report on a Move it does not flag, rather than showing the last one's record", async () => {
    const user = userEvent.setup();
    render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i })); // e5, Black's reply

    expect(within(record()).queryByRole("group", { name: /il fallait jouer/i })).toBeNull();
    expect(record().textContent).toMatch(/rien à signaler/i);
  });

  it("draws the first Move of each line on the board, not only in notation", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Reading a notation back into a Position is the very skill the Player does
    // not have yet — which is why they need the tool. `react-chessboard` names
    // each arrow's head after its squares, which is the only handle it offers.
    const arrows = [...container.querySelectorAll("marker[id]")].map((m) => m.id);
    expect(arrows.some((id) => id.endsWith("-d2-d4"))).toBe(true); // what should have been played
    expect(arrows.some((id) => id.endsWith("-e7-e5"))).toBe(true); // the refutation's first Move
  });

  it("shows the Position a focused ply of a line leads to, and goes back on blur", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i }));

    const refutation = within(record()).getByRole("group", { name: /réfutation/i });
    const [reply, second] = within(refutation).getAllByRole("button");

    fireEvent.focus(reply);
    expect(pieceAt(container, "e5")).toBe("bP"); // the reply, played on the board

    fireEvent.focus(second);
    expect(pieceAt(container, "f3")).toBe("wN"); // two plies into the line

    fireEvent.blur(second);
    expect(pieceAt(container, "e5")).toBeNull(); // back to the Move being reviewed
    expect(pieceAt(container, "e4")).toBe("wP");
  });

  it("keeps a focused preview when the pointer leaves — hover is an affordance, not a second mechanism", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i }));

    const ply = within(record()).getAllByRole("button")[0];
    fireEvent.focus(ply);
    fireEvent.mouseEnter(ply);
    fireEvent.mouseLeave(ply);

    // The pointer moved away; the focus did not. A Player reading the line with
    // the keyboard must not lose their preview because the mouse happened to be
    // resting on that button.
    expect(pieceAt(container, "d4")).toBe("wP");
  });

  it("never moves the Player's place in the Game while previewing", async () => {
    const user = userEvent.setup();
    render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.focus(within(record()).getAllByRole("button")[0]);

    // The board shows the previewed Position, but everything that names *where
    // the Player is* still names the reviewed Move: readout, balance bar, the
    // move list's current item, the curve's cursor.
    expect(screen.getByLabelText("current move").textContent).toContain("e4");
    expect(screen.getByRole("button", { name: "e4", current: true })).toBeTruthy();
  });

  it("ends a preview when the Player navigates, rather than leaving another Move's line on the board", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.focus(within(record()).getAllByRole("button")[0]);

    await user.click(screen.getByRole("button", { name: /next/i }));

    // e5 has been played: the board is on the new Move, not on the previous
    // Move's variation.
    expect(pieceAt(container, "e5")).toBe("bP");
    expect(screen.getByLabelText("current move").textContent).toContain("e5");
  });

  it("puts every ply of a line within reach of the keyboard, previewing on focus", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i }));

    // Tabbing walks the line ply by ply: the preview is the only thing that
    // makes a line readable, so it may not be pointer-only.
    const plies = within(record()).getAllByRole("button");
    plies[0].focus();
    await user.tab();

    expect(document.activeElement).toBe(plies[1]);
    expect(pieceAt(container, "d5")).toBe("bP"); // two plies in, previewed
  });

  it("withholds the record below the Detailed level — Annotated is what US-7 and US-14 delivered", async () => {
    const user = userEvent.setup();
    render(<Board pgn="1. e4 e5" annotations={annotations} />);
    await user.click(screen.getByRole("button", { name: /next/i })); // e4, a Blunder

    // The annotations themselves are there; only the record is the level above.
    expect(screen.getByLabelText("blunder")).toBeTruthy();
    expect(screen.queryByRole("region", { name: /relevé/i })).toBeNull();
  });

  it("points to the record from BESIDE the board, so it is not a panel the Player has to already know about", () => {
    render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);

    const link = screen.getByRole("link", { name: /relevé/i });
    // In the side pane — never stacked above the diagram, which must be whole on
    // arrival — and pointing at the panel's own heading.
    expect(link.closest('[data-pane="side"]')).not.toBeNull();
    expect(link.getAttribute("href")).toBe("#move-record-heading");
    expect(document.getElementById("move-record-heading")).not.toBeNull();
  });

  it("offers no way to the record at a level that does not show one", () => {
    render(<Board pgn="1. e4 e5" annotations={annotations} />);

    expect(screen.queryByRole("link", { name: /relevé/i })).toBeNull();
  });

  it("names the Phase the reviewed Move was played in, on every Move and not only on a flawed one", async () => {
    const user = userEvent.setup();
    render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);

    // Ply 0 is the starting Position: nothing to report, but a Phase all the same.
    expect(record().textContent).toMatch(/début de partie/i);

    await user.click(screen.getByRole("button", { name: /next/i })); // e4, a Blunder
    expect(record().textContent).toMatch(/début de partie/i);
  });

  it("says whether the reviewed Move counts, and names the reason in words when it does not", async () => {
    const user = userEvent.setup();
    const forced = annotations.map((a, i) =>
      i === 1 ? { ...a, counted: { counted: false, reason: "forced" as const }, chancesLost: 0 } : a,
    );
    render(<Board pgn="1. e4 e5" annotations={forced} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i })); // e4

    expect(record().textContent).toMatch(/ne compte pas/i);
    expect(record().textContent).toMatch(/forcé/i);
    // The two reasons are never melted into one: this one is not the other.
    expect(record().textContent).not.toMatch(/déjà décidée/i);
  });

  it("says a Move counts, rather than staying silent about the denominator", async () => {
    const user = userEvent.setup();
    const counted = annotations.map((a, i) =>
      i === 1 ? { ...a, counted: { counted: true, reason: null }, chancesLost: 0 } : a,
    );
    render(<Board pgn="1. e4 e5" annotations={counted} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(record().textContent).toMatch(/compté dans l'analyse/i);
  });

  it("asserts NOTHING about the opponent's Moves — not even that they do not count", () => {
    render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);

    // Ply 0 carries no `counted` either: it is not a Move.
    expect(record().textContent).not.toMatch(/compte/i);
  });

  it("keeps the record BELOW the board row, so nothing above the board moves when the Move changes", async () => {
    const user = userEvent.setup();
    const { container } = render(<Board pgn="1. e4 e5" annotations={annotations} detailed />);
    await user.click(screen.getByRole("button", { name: /next/i }));

    const row = container.querySelector('[data-row="board"]')!;
    expect(row.contains(record())).toBe(false);
    // Document order: the row, then the record. Its height is variable — that is
    // exactly why it may not sit above the diagram.
    expect(row.compareDocumentPosition(record())).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
