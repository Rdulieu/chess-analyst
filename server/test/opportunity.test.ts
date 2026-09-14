import { describe, it, expect } from "vitest";
import { gameAnnotations, moveOpportunities, type Ply } from "../src/analysis/derivation";
import { gamePositions } from "../src/chess/positions";
import { fixtureBestLine } from "../src/engine/fixture";

/** A ply with only what this derivation reads: the Position and the winning
 *  chances of whoever is to move there (same shape as `counted.test.ts`). */
const ply = (fen: string, winChances: number): Ply => ({
  fen,
  evaluation: { cp: 0, mate: null },
  winChances,
  bestLine: [],
});

/** A quiet Position with many legal Moves, White to move. */
const OPEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
/** The same, Black to move. */
const OPEN_BLACK = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1";
/** White is in check from the rook on g1, boxed in by their own pawns: `Kxg1`
 *  is the **only** legal Move. No engine is needed to know that. */
const SOLE_LEGAL = "7k/8/8/8/8/8/5PPP/6rK w - - 0 1";

/**
 * Three plies where **White** (the opponent, in every test below) moves from
 * `before` and leaves the Player a Position worth `afterForOpponent` to them.
 * The Player is Black, so ply 1 is the opponent's Move and ply 2 is the
 * Player's own — deliberately, so the two subjects never share an index.
 */
function opponentMove(before: number, afterForOpponent: number, from = OPEN): Ply[] {
  // `winChances` is always relative to whoever is to move. After White's Move it
  // is Black to move, so the stored figure is Black's: `100 - afterForOpponent`.
  return [ply(from, before), ply(OPEN_BLACK, 100 - afterForOpponent), ply(OPEN, 50)];
}

const severities = (plies: Ply[]) =>
  moveOpportunities(plies, "black").map((o) => (o === null ? null : o.severity));

describe("Opportunity — whose Moves are measured", () => {
  it("measures the opponent's Move and derives nothing for the Player's own", () => {
    // White (opponent) drops 40 points; Black (the Player) then drops 40 too.
    const plies = [ply(OPEN, 60), ply(OPEN_BLACK, 80), ply(OPEN, 80)];

    const opportunities = moveOpportunities(plies, "black");

    // Index i is the Move leading to ply i; ply 0 is no Move at all.
    expect(opportunities[0]).toBeNull();
    expect(opportunities[1]).toEqual({ severity: "blunder" }); // the opponent's
    expect(opportunities[2]).toBeNull(); // the Player's own — measured as `severity`
  });

  it("reads the opponent's drop from the opponent's side, not the Player's", () => {
    // White at 60 leaves a Position worth 45 to White: a 15-point drop for White,
    // which is an `Opportunity` of the size of an Inaccuracy — and not the 15
    // points Black *gained*, which is the same number only because both sides'
    // chances sum to 100.
    expect(severities(opponentMove(60, 45))).toEqual([null, "inaccuracy", null]);
  });

  it("carries no Opportunity where the opponent played well", () => {
    expect(severities(opponentMove(50, 50))).toEqual([null, null, null]);
  });
});

describe("Opportunity — the band is the Player's own, both sides of every boundary", () => {
  // The bands are `classifyMove`'s, 5 / 20 / 30, read off the same function: no
  // second threshold exists for the opponent's side.
  it("does not flag a drop just under the Inaccuracy floor", () => {
    expect(severities(opponentMove(60, 55.001))).toEqual([null, null, null]);
  });

  it("flags a drop exactly on the Inaccuracy floor", () => {
    expect(severities(opponentMove(60, 55))).toEqual([null, "inaccuracy", null]);
  });

  it("keeps a drop just under the Mistake floor an Inaccuracy", () => {
    expect(severities(opponentMove(60, 40.001))).toEqual([null, "inaccuracy", null]);
  });

  it("flags a drop exactly on the Mistake floor", () => {
    expect(severities(opponentMove(60, 40))).toEqual([null, "mistake", null]);
  });

  it("keeps a drop just under the Blunder floor a Mistake", () => {
    expect(severities(opponentMove(60, 30.001))).toEqual([null, "mistake", null]);
  });

  it("flags a drop exactly on the Blunder floor", () => {
    expect(severities(opponentMove(60, 30))).toEqual([null, "blunder", null]);
  });
});

describe("Opportunity — the Counted Move exclusions are mirrored only halfway", () => {
  it("still offers an Opportunity when the opponent's Move was forced", () => {
    // `forced` exists so that nobody is *blamed*; nobody is blamed here, and the
    // piece the opponent had to give is no less takeable.
    expect(severities(opponentMove(60, 30, SOLE_LEGAL))).toEqual([null, "blunder", null]);
  });

  it("offers nothing in a Position that was already decided", () => {
    // White at 9%: under the floor there is nothing left to take, so a drop there
    // is not an `Opportunity` at all.
    expect(severities(opponentMove(9, 2))).toEqual([null, null, null]);
  });

  it("still offers an Opportunity from the floor itself", () => {
    // Strictly *under* the floor is decided; the floor itself still has
    // something left to lose — the same boundary `countedMoves` draws.
    expect(severities(opponentMove(10, 4))).toEqual([null, "inaccuracy", null]);
  });
});

/** Stamps each stored `Evaluation` with the FEN and `Best line` of its Position,
 *  as the `Analysis pass` writes them (ADR-0012, ADR-0016). */
function stored<T extends { ply: number }>(pgn: string, evals: T[]) {
  const fens = gamePositions(pgn);
  return evals.map((e) => ({ ...e, fen: fens[e.ply], pv: fixtureBestLine(fens[e.ply]).join(" ") }));
}

describe("gameAnnotations — the Opportunity travels beside the severity, never inside it", () => {
  const game = { pgn: "1. e4 e5", playerColor: "black" as const };
  const evals = stored(game.pgn, [
    { ply: 0, cp: 0, mate: null }, // White (the opponent) to move, 50%.
    { ply: 1, cp: null, mate: 3 }, // Black to move with a forced mate: White just gave it away.
    { ply: 2, cp: null, mate: -2 }, // White to move, mated: the Player kept what was handed to them.
  ]);

  it("puts the opponent's flaw in a field of its own", () => {
    expect(gameAnnotations(game, evals)[1].opportunity).toEqual({ severity: "blunder" });
  });

  it("leaves `severity` null on the opponent's ply, whatever the Opportunity says", () => {
    // The whole point of ADR-0034: filling `severity` here would silently change
    // the subject of `Danger position`, of "vos erreurs" and of the weak openings.
    expect(gameAnnotations(game, evals)[1].severity).toBeNull();
  });

  it("carries no Opportunity on the Player's own plies", () => {
    expect(gameAnnotations(game, evals).map((a) => a.opportunity)).toEqual([
      null,
      { severity: "blunder" },
      null,
    ]);
  });

  it("leaves every Player-side figure exactly as it was before the Opportunity existed", () => {
    // The non-regression anchor: `severity`, `counted` and `chancesLost` are what
    // `Danger position`, the error tally and the weak openings read, and this is a
    // Game where the opponent blundered outright.
    const annotations = gameAnnotations(game, evals);

    expect(annotations.map((a) => a.severity)).toEqual([null, null, null]);
    expect(annotations.map((a) => a.counted)).toEqual([null, null, { counted: true, reason: null }]);
    expect(annotations.map((a) => a.chancesLost)).toEqual([null, null, 0]);
  });
});
