import { describe, it, expect } from "vitest";
import { FEN } from "cm-chess";
import { startingPosition, parseGame, gameHeaders } from "../src/chess/history";
import { OPERA_PGN } from "./fixtures";

describe("startingPosition", () => {
  it("is the standard start position for a game played from the standard setup", () => {
    expect(startingPosition(OPERA_PGN)).toBe(FEN.start);
  });

  it("throws on an unparseable PGN rather than returning a wrong position", () => {
    expect(() => startingPosition("this is not a pgn 1. zz99")).toThrow();
  });
});

describe("parseGame", () => {
  it("exposes the starting Position and each Move's SAN and resulting FEN", () => {
    const game = parseGame(OPERA_PGN);

    expect(game.startFen).toBe(FEN.start);
    // The Opera Game is 33 half-moves, ending on the mating rook move.
    expect(game.plies).toHaveLength(33);
    expect(game.plies[0].san).toBe("e4");
    expect(game.plies[0].fen).toBe(
      "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    );
    expect(game.plies[0].to).toBe("e4");
    expect(game.plies.at(-1)?.san).toMatch(/^Rd8/);
  });

  it("parses a real chess.com PGN (clock comments and a trailing newline)", () => {
    // chess.com serves the movetext with {[%clk …]} comments and ends the PGN
    // with a trailing newline — cm-chess's parser rejects that trailing
    // whitespace, so parseGame must tolerate it.
    const pgn =
      '[Event "Live Chess"]\n[Site "Chess.com"]\n[Result "1-0"]\n[TimeControl "180"]\n\n' +
      "1. e4 {[%clk 0:03:00]} 1... e5 {[%clk 0:02:58]} 2. Nf3 {[%clk 0:02:55]} 1-0\n";

    const game = parseGame(pgn);

    expect(game.plies.map((p) => p.san)).toEqual(["e4", "e5", "Nf3"]);
  });
});

/** Reads the piece char on a square from a FEN's placement field, or null. */
function pieceOn(fen: string, square: string): string | null {
  const ranks = fen.split(" ")[0].split("/"); // ranks[0] = rank 8 … ranks[7] = rank 1
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const row = ranks[8 - Number(square[1])];
  let f = 0;
  for (const ch of row) {
    if (/\d/.test(ch)) {
      f += Number(ch);
    } else {
      if (f === file) return ch;
      f += 1;
    }
  }
  return null;
}

describe("parseGame — special moves resolve to the correct Position", () => {
  const lastPly = (pgn: string) => parseGame(pgn).plies.at(-1)!;

  it("handles castling (king and rook end on the castled squares)", () => {
    const ply = lastPly("1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O");
    expect(ply.san).toBe("O-O");
    expect(pieceOn(ply.fen, "g1")).toBe("K");
    expect(pieceOn(ply.fen, "f1")).toBe("R");
    expect(pieceOn(ply.fen, "e1")).toBeNull();
    expect(ply.to).toBe("g1"); // the king's destination, not the rook's
  });

  it("handles en passant (capturing pawn lands behind, captured pawn removed)", () => {
    const ply = lastPly("1. e4 e6 2. e5 d5 3. exd6");
    expect(ply.san).toBe("exd6");
    expect(pieceOn(ply.fen, "d6")).toBe("P");
    expect(pieceOn(ply.fen, "d5")).toBeNull();
    expect(pieceOn(ply.fen, "e5")).toBeNull();
  });

  it("handles promotion (pawn becomes the promoted piece)", () => {
    const ply = lastPly("1. a4 b5 2. axb5 a6 3. bxa6 c6 4. a7 c5 5. axb8=Q");
    expect(ply.san).toBe("axb8=Q");
    expect(pieceOn(ply.fen, "b8")).toBe("Q");
  });
});

describe("gameHeaders", () => {
  it("reads both players' names from the PGN's White/Black tags", () => {
    expect(gameHeaders(OPERA_PGN)).toEqual({
      white: "Paul Morphy",
      black: "Duke Karl / Count Isouard",
    });
  });

  it("returns null for a name the PGN does not carry, rather than inventing one", () => {
    const pgn = ['[White "Alice"]', '[Result "1-0"]', "", "1. e4 e5 1-0"].join("\n");
    expect(gameHeaders(pgn)).toEqual({ white: "Alice", black: null });
  });

  it("returns both names null for a PGN with no player tags at all", () => {
    expect(gameHeaders("1. e4 e5 *")).toEqual({ white: null, black: null });
  });

  it("treats chess.com's placeholder for an unnamed side as no name", () => {
    const pgn = ['[White "?"]', '[Black "Bob"]', "", "1. e4 e5 *"].join("\n");
    expect(gameHeaders(pgn)).toEqual({ white: null, black: "Bob" });
  });
});

describe("an aborted Game", () => {
  // A Game we keep on purpose (US-12): both Platforms send them, so both must
  // replay. Its PGN has headers, no move, and `*` — the shape the parser used to
  // reject outright.
  const ABORTED = ['[White "someone"]', '[Black "opponent"]', '[Result "*"]', "", "*"].join("\n");

  it("opens on the initial Position with no ply to walk, rather than failing to load", () => {
    const history = parseGame(ABORTED);

    expect(history.plies).toEqual([]);
    expect(history.startFen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  });

  it("still names both players, so the header reads like any other Game's", () => {
    expect(gameHeaders(ABORTED)).toEqual({ white: "someone", black: "opponent" });
  });
});
