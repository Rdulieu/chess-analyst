import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { phases, type Phase } from "../src/analysis/phase";
import { gamePositions } from "../src/chess/positions";

/** The `Phase` of every Position of a Game, read from its PGN's own FENs — the
 *  same FENs the `Analysis pass` stores with each `Evaluation` (ADR-0012). */
function phasesOf(pgn: string): Phase[] {
  return phases(gamePositions(pgn));
}

/** A FEN whose only interesting part is its placement. */
function fen(placement: string, fullmove = 1): string {
  return `${placement} w - - 0 ${fullmove}`;
}

describe("Phase — the Middlegame boundary (Divider.scala, ADR-0035)", () => {
  it("holds a Game in the Early game while the whole army is still home", () => {
    // 1.e4 e5: 14 majors and minors, both back ranks full, and the mixedness of
    // an untouched army is 0 — none of the three criteria can fire.
    expect(phasesOf("1. e4 e5")).toEqual(["early", "early", "early"]);
  });

  it("scores the starting Position at a mixedness of exactly 0", () => {
    // The anchor of the whole transcription: every 2x2 window of the initial
    // Position is a single-colour block on its own home band, and every one of
    // those scores nothing. A transcription that drifts shows up here first.
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    expect(phases([fen(start)])).toEqual(["early"]);
  });

  it("opens the Middlegame as soon as majors and minors drop to ten", () => {
    // Eleven, then ten: the same Position minus one white queen. FABRICATED
    // fixtures — no real Game loses a queen with every pawn still home. Both
    // back ranks still carry four men and both score a mixedness of 0, so the
    // piece count is the only criterion that can move.
    const eleven = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R2QKB1R";
    const ten = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R3KB1R";

    expect(phases([fen(eleven)])).toEqual(["early"]);
    expect(phases([fen(ten)])).toEqual(["middlegame"]);
  });

  it("opens the Middlegame on a back rank left with fewer than four pieces", () => {
    // White's first rank holds four men, then three — one rook steps off it and
    // nothing else changes. Fourteen majors and minors either way, and a
    // mixedness far under 150, so only the sparse back rank can move the
    // boundary. FABRICATED fixtures: no real Game parks a queen and two knights
    // on the third rank with every pawn still home.
    const four = "rnbqkbnr/pppppppp/8/8/8/QNNB4/PPPPPPPP/RB2K2R";
    const three = "rnbqkbnr/pppppppp/8/8/8/QNNB1R2/PPPPPPPP/RB2K3";

    expect(phases([fen(four)])[0]).toBe("early");
    expect(phases([fen(three)])[0]).toBe("middlegame");
  });

  it("opens the Middlegame on interlocked armies alone, before either other criterion", () => {
    // A REAL Game of the base (id 272), cut at the boundary lichess published:
    // ply 19. Fourteen majors and minors are still on the board and both back
    // ranks still carry four men, so neither of the other two criteria can have
    // fired — `mixedness` is alone, as it is in 152 of the 415 measured Games.
    const pgn =
      "1. e4 e5 2. Nf3 Qf6 3. d4 exd4 4. Nxd4 Bc5 5. c3 Nc6 6. Be3 d6 " +
      "7. Bd3 Bxd4 8. cxd4 Qg6 9. O-O Nb4 10. f4 Nxd3";
    const result = phasesOf(pgn);

    expect(result[18]).toBe("early");
    expect(result[19]).toBe("middlegame");
  });

  it("leaves a Game that never gets going with NO Middlegame at all", () => {
    // 98 of the 2 438 Games of the base have none (median 17 half-moves): it is
    // lichess's own `middle: None`, reproduced, not a hole to fill (ADR-0035).
    // A short shuffle of the rook's pawn and rook: nothing is ever exchanged,
    // the back ranks stay full, and the armies never meet.
    const result = phasesOf("1. h3 h6 2. Rh2 Rh7 3. Rh1 Rh8 4. Rh2 Rh7");
    expect(result.every((phase) => phase === "early")).toBe(true);
  });
});

describe("Phase — the Endgame boundary", () => {
  it("enters the Endgame when majors and minors, both sides combined, drop to six", () => {
    const seven = "r2qk2r/pppppppp/2n5/8/8/8/PPPPPPPP/R2QK2R";
    const six = "r2qk2r/pppppppp/8/8/8/8/PPPPPPPP/R2QK2R";

    expect(phases([fen(seven)])).toEqual(["middlegame"]);
    expect(phases([fen(six)])).toEqual(["endgame"]);
  });

  it("does not count kings or pawns — an Endgame is about the pieces that are gone", () => {
    const pawnsOnly = "4k3/pppppppp/8/8/8/8/PPPPPPPP/4K3";
    expect(phases([fen(pawnsOnly)])).toEqual(["endgame"]);
  });

  it("gives no Middlegame at all to a Game that reaches the Endgame in the same breath", () => {
    // Both boundaries fall on the same Position, and lichess answers `middle:
    // None` rather than a Middlegame of length zero. FABRICATED fixture.
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    const stripped = "4k3/pppppppp/8/8/8/8/PPPPPPPP/R3K2R";

    expect(phases([fen(start), fen(stripped)])).toEqual(["early", "endgame"]);
  });
});

describe("Phase — latching", () => {
  it("keeps a Game in the Endgame after a promotion puts material back on the board", () => {
    const endgame = fen("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R");
    // Eight pieces: Position by Position this reads as a Middlegame again.
    const promoted = fen("r2qk2r/pppppppp/2n5/8/8/2N5/PPPPPPPP/R2QK2R");

    expect(phases([endgame, promoted, promoted])).toEqual(["endgame", "endgame", "endgame"]);
  });

  it("never sends a Game back to the Early game once it has left it", () => {
    const stripped = fen("r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R");
    // A Position that, alone, satisfies every Early game condition.
    const home = fen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR");

    // The Phase is a property of the Game's advancement, not a verdict on each
    // Position: two identical Positions in two Games can be in different Phases.
    expect(phases([home, stripped, home])).toEqual(["early", "endgame", "endgame"]);
  });
});

/**
 * The oracle, and what it is worth.
 *
 * **This test now checks a copy of itself.** Our derivation IS lichess's rule
 * (ADR-0035), so the agreement below is true by construction, and it proves the
 * **fidelity of the transcription** — that our 49 windows, our weights and our
 * two thresholds are theirs — and **not** that the thresholds are the right
 * ones. Nobody has measured whether 6 is the right number of pieces for an
 * Endgame, and this suite does not.
 *
 * It is still the best check available: it is free, it is real Games, and it is
 * the one thing that would catch a transcription drift a hand-written Position
 * would sail past. ADR-0031's oracle has become a regression net; saying so is
 * better than believing otherwise.
 *
 * The data: every Game of the local base carrying a `Lichess division`, reduced
 * to its movetext and the two plies lichess published. The base is not
 * committed (ADR-0003), so it was extracted once — regenerate with
 * `node scripts/build-division-fixture.mjs`.
 */
describe("Phase — replayed against the Lichess division", () => {
  interface DividedGame {
    id: number;
    moves: string;
    middle: number | null;
    end: number | null;
  }

  const games: DividedGame[] = JSON.parse(
    readFileSync(new URL("./fixtures/lichess-division.json", import.meta.url), "utf8"),
  );

  it("agrees with lichess on BOTH boundaries, on every Game that carries one", () => {
    expect(games.length).toBe(415);

    const disagreements = games.flatMap((game) => {
      const derived = phases(gamePositions(game.moves));
      const middle = derived.indexOf("middlegame");
      const end = derived.indexOf("endgame");
      const ours = { middle: middle === -1 ? null : middle, end: end === -1 ? null : end };
      const theirs = { middle: game.middle, end: game.end };
      return ours.middle === theirs.middle && ours.end === theirs.end
        ? []
        : [{ id: game.id, ours, theirs }];
    });

    expect(disagreements).toEqual([]);
  });
});
