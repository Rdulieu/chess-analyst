import { describe, it, expect } from "vitest";
import { phases, type Phase } from "../src/analysis/phase";
import { gamePositions } from "../src/chess/positions";

/** The `Phase` of every Position of a Game, read from its PGN's own FENs — the
 *  same FENs the `Analysis pass` stores with each `Evaluation` (ADR-0012). */
function phasesOf(pgn: string): Phase[] {
  return phases(gamePositions(pgn));
}

/** A FEN whose only interesting part is its placement, castling and move number. */
function fen(placement: string, castling = "-", fullmove = 1): string {
  return `${placement} w ${castling} - 0 ${fullmove}`;
}

describe("Phase — the Early game boundary", () => {
  it("holds a Game in the Early game while the pieces are still at home", () => {
    // 1.e4 e5: nothing developed, nobody castled, move 1.
    expect(phasesOf("1. e4 e5")).toEqual(["early", "early", "early"]);
  });

  it("ends the Early game once BOTH sides have developed and settled their king", () => {
    // The four minors of each side off their home squares, and both kings
    // castled — development complete well before the move cap.
    const pgn =
      "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 d6 5. Nc3 Nf6 6. Bg5 Bg4 7. O-O O-O";
    const result = phasesOf(pgn);

    // The last Move is Black's castling: before it Black's king still had the
    // right, so the Game is still starting; after it, it is not.
    expect(result[result.length - 2]).toBe("early");
    expect(result[result.length - 1]).toBe("middlegame");
  });

  it("ends the Early game at the move cap even when nothing was ever developed", () => {
    // A deliberately passive Game: the rooks walk their own file and back, so
    // "development complete" never fires and only the cap can end the start.
    const pairs = ["Rh3 Rh6", "Rg3 Rg6"];
    const shuffle = Array.from({ length: 15 }, (_, i) => `${i + 2}. ${pairs[i % 2]}`).join(" ");
    const result = phasesOf(`1. h4 h5 ${shuffle}`);

    // A passive Game cannot still claim to be starting after forty moves.
    expect(result[result.length - 1]).not.toBe("early");
    // ...and it was still starting well into the Game: the cap is a backstop,
    // not the usual boundary.
    expect(result[10]).toBe("early");
  });

  it("counts a minor that has been captured as no longer at home", () => {
    // Both bishops of each side captured, both knights out, both kings having
    // lost the right: development is complete even though four minors are gone.
    const placement = "r2qk2r/pppppppp/2n2n2/8/8/2N2N2/PPPPPPPP/R2QK2R";
    expect(phases([fen(placement, "-")])).toEqual(["middlegame"]);
  });
});

describe("Phase — the Endgame boundary", () => {
  it("enters the Endgame when majors and minors, both sides combined, drop to six", () => {
    // Seven pieces, then six: the same Position minus one knight. Nothing else
    // differs, so only the count can move the boundary.
    const seven = "r2qk2r/pppppppp/2n5/8/8/8/PPPPPPPP/R2QK2R";
    const six = "r2qk2r/pppppppp/8/8/8/8/PPPPPPPP/R2QK2R";

    expect(phases([fen(seven, "-")])).toEqual(["middlegame"]);
    expect(phases([fen(six, "-")])).toEqual(["endgame"]);
  });

  it("does not count kings or pawns — an Endgame is about the pieces that are gone", () => {
    const pawnsOnly = "4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3";
    expect(phases([fen(pawnsOnly, "-")])).toEqual(["endgame"]);
  });
});

describe("Phase — latching", () => {
  it("keeps a Game in the Endgame after a promotion puts material back on the board", () => {
    // Position 1 is an Endgame (four pieces); position 2 adds a queen and would,
    // Position by Position, read as a Middlegame again.
    const endgame = fen("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R", "-");
    // Eight pieces: Position by Position this reads as a Middlegame again.
    const promoted = fen("r2qk2r/pppppppp/2n5/8/8/2N5/PPPPPPPP/R2QK2R", "-");

    expect(phases([endgame, promoted, promoted])).toEqual(["endgame", "endgame", "endgame"]);
  });

  it("never sends a Game back to the Early game once it has left it", () => {
    const developed = fen("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R", "-");
    // A Position that, alone, satisfies every Early game condition.
    const home = fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR", "KQkq");

    // The Phase is a property of the Game's advancement, not a verdict on each
    // Position: two identical Positions in two Games can be in different Phases.
    expect(phases([home, developed, home])).toEqual(["early", "endgame", "endgame"]);
  });
});

describe("Phase — the transitions a Game announces", () => {
  it("names at most two boundaries, and none at all for a Game that never leaves the start", () => {
    expect(phaseStarts(phasesOf("1. e4 e5 2. Nf3 Nc6"))).toEqual([]);
  });
});

/** The ply at which each Phase after the first begins — what the move list marks. */
function phaseStarts(result: Phase[]): { ply: number; phase: Phase }[] {
  return result.flatMap((phase, ply) =>
    ply > 0 && phase !== result[ply - 1] ? [{ ply, phase }] : [],
  );
}
