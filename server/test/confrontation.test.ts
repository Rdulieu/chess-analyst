import { describe, it, expect } from "vitest";
import { confrontGame, ConfrontationRefusal } from "../src/personal/confrontation";
import type { GameConfrontation } from "../src/personal/confrontation";
import { gameAnnotations, type StoredEvaluation } from "../src/analysis/derivation";
import { gameRecap } from "../src/analysis/recap";
import { gamePositions } from "../src/chess/positions";
import type { GameAnnotations } from "../src/annotations/repository";
import type { PersonalAnalysis, PersonalMark } from "../src/personal/repository";

/**
 * Stored rows for a Game whose Positions come from its own PGN, with the winning
 * chances driven by the centipawn scores. Same fixture shape as `recap.test.ts`:
 * the confrontation is a **join** against the very rows that file already
 * exercises, so it is fed the same way.
 */
function stored(pgn: string, cps: number[]): StoredEvaluation[] {
  const fens = gamePositions(pgn);
  return cps.map((cp, ply) => ({ ply, fen: fens[ply], cp, mate: null, pv: "" }));
}

/** A Game long enough to hold a few Moves of each side. */
const PGN = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 d6";
const REGIME = { depth: 16, lines: 2 };
const QUIET = [0, 0, 0, 0, 0, 0, 0, 0, 0];

/** What the API already serves for a Game — the confrontation's one engine-side input. */
function annotationsOf(cps: number[] = QUIET): GameAnnotations {
  const evals = stored(PGN, cps);
  const game = { playerColor: "white" as const };
  return {
    analyzed: true,
    plies: gameAnnotations({ ...game, id: 1 } as never, evals),
    regime: REGIME,
    recap: gameRecap(game, evals, REGIME),
  };
}

/**
 * The same, from Positions given outright rather than replayed from a PGN — the
 * way `counted.test.ts` builds the Positions that no opening reaches.
 */
function annotationsFrom(
  fens: string[],
  cps: number[],
  playerColor: "white" | "black",
): GameAnnotations {
  const evals: StoredEvaluation[] = fens.map((fen, ply) => ({
    ply,
    fen,
    cp: cps[ply],
    mate: null,
    pv: "",
  }));
  const game = { playerColor };
  return {
    analyzed: true,
    plies: gameAnnotations({ ...game, id: 1 } as never, evals),
    regime: REGIME,
    recap: gameRecap(game, evals, REGIME),
  };
}

/** A sealed reading carrying the given marks. */
function sealed(marks: Partial<PersonalMark>[]): PersonalAnalysis {
  return {
    gameId: 1,
    sealedAt: "2026-08-25T10:00:00.000Z",
    engineSeenBeforeSeal: false,
    marks: marks.map((m) => ({
      ply: 0,
      declaredSeverity: null,
      note: null,
      keyMoment: false,
      posterior: false,
      ...m,
    })),
  };
}

/**
 * The confrontation of a reading the test means to be confrontable. A refusal
 * here is the test's own setup being wrong, and it fails as such rather than
 * being narrowed away silently.
 */
function confronted(
  ...args: Parameters<typeof confrontGame>
): GameConfrontation {
  const result = confrontGame(...args);
  if (result instanceof ConfrontationRefusal) {
    throw new Error(`expected a Confrontation, got a refusal: ${result.reason}`);
  }
  return result;
}

describe("confrontGame — the Player's reading against the engine's", () => {
  it("counts the Player's Counted Moves as the denominator, not the Game's half-moves", () => {
    // Eight half-moves, four of them White's, none forced and none played from a
    // decided Position: the denominator both figures share is 4.
    const result = confronted(sealed([{ ply: 1, declaredSeverity: "sound" }]), annotationsOf());

    expect(result).toMatchObject({
      severity: { countedMoves: 4 },
    });
  });

  it("counts as examined only the Moves the Player actually put a verdict on", () => {
    const result = confronted(
      sealed([
        { ply: 1, declaredSeverity: "sound" },
        { ply: 3, declaredSeverity: "mistake" },
        // A Note is not a verdict: the Player said something, they judged nothing.
        { ply: 5, note: "je ne sais pas quoi penser de ce coup" },
      ]),
      annotationsOf(),
    );

    expect(result.severity.examined).toBe(2);
    expect(result.severity.countedMoves).toBe(4);
  });

  it("leaves a Move with no verdict out of BOTH figures — silence is not a verdict", () => {
    // The whole point of keeping coverage and accuracy apart: annotating two
    // Moves out of four and judging them perfectly is 100% accuracy and 50%
    // coverage, and both are true.
    const result = confronted(
      sealed([
        { ply: 1, declaredSeverity: "sound" },
        { ply: 3, declaredSeverity: "sound" },
      ]),
      annotationsOf(),
    );

    expect(result.severity).toMatchObject({ countedMoves: 4, examined: 2, agreed: 2 });
  });

  it("does not credit a verdict the engine contradicts", () => {
    // Move 3 (ply 5, White's Bc4) throws the game away; the Player calls it fine.
    const result = confronted(
      sealed([{ ply: 5, declaredSeverity: "sound" }]),
      annotationsOf([30, -20, 10, -40, 20, 480, -460, 450, -470]),
    );

    // Anchored on purpose: were the fixture to stop flagging this Move, `sound`
    // would become an agreement and the test would pass while asserting nothing.
    expect(annotationsOf([30, -20, 10, -40, 20, 480, -460, 450, -470]).plies[5].severity)
      .not.toBeNull();
    expect(result.severity).toMatchObject({ examined: 1, agreed: 0 });
  });

  it("confronts the sealed layer only — what was written after the reveal never counts", () => {
    const cps = [30, -20, 10, -40, 20, 480, -460, 450, -470];
    // Sealed: one verdict, and it is wrong. Then, having seen the engine, the
    // Player corrects themselves on the very same Move.
    const result = confronted(
      sealed([
        { ply: 5, declaredSeverity: "sound" },
        { ply: 5, declaredSeverity: "blunder", posterior: true },
        { ply: 7, declaredSeverity: "sound", posterior: true },
      ]),
      annotationsOf(cps),
    );

    // The correction is kept and shown elsewhere; here it changes nothing at all.
    expect(result.severity).toMatchObject({ examined: 1, agreed: 0 });
  });

  it("scores none of the Player's verdicts on the OPPONENT's Moves", () => {
    // Kept and shown, never scored — not for want of the means, but because this
    // tool is about the Player's own improvement.
    const result = confronted(
      sealed([
        { ply: 1, declaredSeverity: "sound" },
        { ply: 2, declaredSeverity: "blunder" },
        { ply: 4, declaredSeverity: "mistake" },
      ]),
      annotationsOf(),
    );

    expect(result.severity).toMatchObject({ countedMoves: 4, examined: 1, agreed: 1 });
  });

  it("does not treat a Note on the starting Position as a Move examined", () => {
    const result = confronted(
      sealed([{ ply: 0, note: "une Espagnole que je connais mal" }]),
      annotationsOf(),
    );

    expect(result.severity).toMatchObject({ examined: 0, agreed: 0 });
  });

  it("does not count a FORCED Move wrong when the Player rightly calls it Sound", () => {
    // The case that settles the denominator. White is in check from the rook on
    // g1 and boxed in by their own pawns: `Kxg1` is the ONLY legal Move. It
    // measures as a catastrophe and is nobody's mistake — a Player calling it
    // `Sound` is RIGHT, and a naive matrix would count them wrong. That is why
    // the reading is taken over `Counted Move`s only.
    const annotations = annotationsFrom(
      ["7k/8/8/8/8/8/5PPP/6rK w - - 0 1", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1"],
      [60, 60],
      "white",
    );

    // Anchored: the Move IS excluded, and for THAT reason.
    expect(annotations.plies[1].counted).toEqual({ counted: false, reason: "forced" });

    const result = confronted(sealed([{ ply: 1, declaredSeverity: "sound" }]), annotations);

    // Not examined, not disagreed with, not held against the Player anywhere.
    expect(result.severity).toMatchObject({ countedMoves: 0, examined: 0, agreed: 0 });
  });

  it("counts a Good as examined but never as scorable — the engine has no band for merit", () => {
    // The engine flags flawed Moves only, so there is nothing to set `Good`
    // against. Both halves matter and each is wrong on its own: dropping it from
    // coverage would deny the Player looked, and keeping it in accuracy would
    // judge a verdict that has no counterpart.
    const result = confronted(
      sealed([
        { ply: 1, declaredSeverity: "good" },
        { ply: 3, declaredSeverity: "sound" },
      ]),
      annotationsOf(),
    );

    expect(result.severity).toMatchObject({
      countedMoves: 4,
      examined: 2,
      scorable: 1,
      agreed: 1,
    });
  });

  it("labels the reading by its provenance — a comparison with no provenance is not one", () => {
    const unaided = confronted(sealed([{ ply: 1, declaredSeverity: "sound" }]), annotationsOf());
    expect(unaided).toMatchObject({ provenance: "unaided" });

    const informed = confronted(
      { ...sealed([{ ply: 1, declaredSeverity: "sound" }]), engineSeenBeforeSeal: true },
      annotationsOf(),
    );
    expect(informed).toMatchObject({ provenance: "informed" });
  });

  it("carries what the aggregate will fold, undivided — no share is computed here", () => {
    const result = confronted(sealed([{ ply: 1, declaredSeverity: "sound" }]), annotationsOf());

    // Numerators and denominators travel; the division happens where it is read.
    // That is what lets the aggregate be a sum of numerators over a sum of
    // denominators rather than an average of rates (ADR-0017).
    expect(Object.keys(result.severity).sort()).toEqual(
      ["agreed", "countedMoves", "examined", "scorable", "matrix"].sort(),
    );
    expect(result).toMatchObject({
      gameId: 1,
      sealedAt: "2026-08-25T10:00:00.000Z",
      regime: REGIME,
    });
  });

  it("holds the five declared bands against the four measured ones", () => {
    // Four columns, not three: "the engine flagged nothing" is a FACT, and it is
    // the column that makes `Sound` scorable at all.
    const result = confronted(sealed([{ ply: 1, declaredSeverity: "sound" }]), annotationsOf());

    expect(Object.keys(result.severity.matrix).sort()).toEqual(
      ["blunder", "mistake", "inaccuracy", "sound", "good"].sort(),
    );
    expect(Object.keys(result.severity.matrix.sound).sort()).toEqual(
      ["blunder", "mistake", "inaccuracy", "none"].sort(),
    );
  });

  it("adds up to the accuracy denominator over its scorable cells", () => {
    // The Player must be able to add the cells they can see and land on the
    // figure printed beside them. Anything else reads as a bug.
    const result = confronted(
      sealed([
        { ply: 1, declaredSeverity: "sound" },
        { ply: 3, declaredSeverity: "good" },
        { ply: 5, declaredSeverity: "blunder" },
      ]),
      annotationsOf([30, -20, 10, -40, 20, 480, -460, 450, -470]),
    );

    const scorableCells = Object.entries(result.severity.matrix)
      .filter(([declared]) => declared !== "good")
      .flatMap(([, row]) => Object.values(row))
      .reduce((a, b) => a + b, 0);

    expect(scorableCells).toBe(result.severity.scorable);
    // And the Good is in the matrix all the same — shown, never scored.
    const goodRow = Object.values(result.severity.matrix.good).reduce((a, b) => a + b, 0);
    expect(goodRow).toBe(1);
  });

  it("puts an agreement on the diagonal and a divergence off it", () => {
    const cps = [30, -20, 10, -40, 20, 480, -460, 450, -470];
    const measured = annotationsOf(cps).plies[5].severity;
    expect(measured).not.toBeNull();

    // The Player calls the same Move one band milder than the engine does.
    const result = confronted(sealed([{ ply: 5, declaredSeverity: "inaccuracy" }]), annotationsOf(cps));

    expect(result.severity.matrix.inaccuracy[measured!]).toBe(1);
    expect(result.severity.agreed).toBe(0);
  });
});

describe("confrontGame — the two refusals, told apart", () => {
  it("refuses an UNSEALED reading: what is confronted has to be fixed first", () => {
    const open = { ...sealed([{ ply: 1, declaredSeverity: "sound" }]), sealedAt: null };

    const result = confrontGame(open, annotationsOf());

    expect(result).toBeInstanceOf(ConfrontationRefusal);
    expect(result).toMatchObject({ reason: "not-sealed" });
  });

  it("refuses an UNANALYZED Game: there is nothing on the other side to confront", () => {
    const result = confrontGame(sealed([{ ply: 1, declaredSeverity: "sound" }]), {
      analyzed: false,
      plies: [],
      regime: null,
      recap: null,
    });

    expect(result).toBeInstanceOf(ConfrontationRefusal);
    expect(result).toMatchObject({ reason: "not-analyzed" });
  });

  it("keeps the two apart — they are different facts with different next steps", () => {
    // Sealing and running the analysis are two different things to go and do.
    // One refusal for both would leave the Player unable to tell which.
    const unsealed = confrontGame(
      { ...sealed([{ ply: 1, declaredSeverity: "sound" }]), sealedAt: null },
      annotationsOf(),
    );
    const unanalyzed = confrontGame(sealed([{ ply: 1, declaredSeverity: "sound" }]), {
      analyzed: false,
      plies: [],
      regime: null,
      recap: null,
    });

    expect((unsealed as ConfrontationRefusal).reason).not.toBe(
      (unanalyzed as ConfrontationRefusal).reason,
    );
  });

  it("says UNSEALED first when a Game is neither sealed nor analyzed", () => {
    // The Player's own act comes first: telling them to go and analyse a Game
    // whose reading they have not finished sends them down the wrong road.
    const result = confrontGame(
      { ...sealed([{ ply: 1, declaredSeverity: "sound" }]), sealedAt: null },
      { analyzed: false, plies: [], regime: null, recap: null },
    );

    expect(result).toMatchObject({ reason: "not-sealed" });
  });
});
