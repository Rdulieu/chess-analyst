import { describe, it, expect } from "vitest";
import { gameRecap } from "../src/analysis/recap";
import { signature } from "../src/analysis/signature";
import { gamePositions } from "../src/chess/positions";
import { gameAnnotations, type StoredEvaluation } from "../src/analysis/derivation";

/**
 * Stored rows for a Game whose Positions come from its own PGN, with the
 * winning chances driven by the centipawn scores. `cp` is side-to-move relative,
 * as stored.
 */
function stored(pgn: string, cps: number[]): StoredEvaluation[] {
  const fens = gamePositions(pgn);
  return cps.map((cp, ply) => ({ ply, fen: fens[ply], cp, mate: null, pv: "" }));
}

/** A Game long enough to hold a few Moves of each side. */
const PGN = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 d6";
const REGIME = { depth: 16, lines: 2 };

describe("gameRecap — what this Game contributes", () => {
  it("is ONE function: the aggregate will fold exactly this, not a second implementation of it", () => {
    // The reconciliation of ADR-0017 is a definition, not a test we hope passes,
    // so the recap has to be a value a caller can sum — not a rendering.
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), REGIME);

    expect(Object.keys(recap).sort()).toEqual(
      [
        "byPhase",
        "bySignature",
        "chancesLost",
        "countedErrors",
        "countedMoves",
        "drift",
        "excluded",
        "flaggedLoss",
        "flaggedMoves",
        "flaggedUncounted",
        "opportunities",
        "playerMoves",
        "regime",
      ].sort(),
    );
  });

  it("breaks the gap between shown and counted down BY REASON, never as one figure", () => {
    // The one overlap the two sets have: a sole legal Move that is also a
    // catastrophe. White is in check from the rook on g1 and boxed in by their
    // own pawns, so `Kxg1` is the ONLY legal Move — and here it walks into a
    // collapse. Flagged by the Game, held against nobody.
    // Positions are written out rather than replayed from a PGN: the point is
    // the Position's shape, and a PGN reaching it would only obscure that.
    const SOLE_LEGAL = "7k/8/8/8/8/8/5PPP/6rK w - - 0 1";
    const AFTER = "7k/8/8/8/8/8/5PPP/6K1 b - - 0 1";
    const evals: StoredEvaluation[] = [
      { ply: 0, fen: SOLE_LEGAL, cp: 120, mate: null, pv: "" },
      { ply: 1, fen: AFTER, cp: 900, mate: null, pv: "" },
    ];

    const recap = gameRecap({ playerColor: "white" }, evals, REGIME);

    // The Move is shown and not counted, and the panel is told WHY.
    expect(recap.flaggedMoves).toBe(1);
    expect(recap.countedErrors).toBe(0);
    expect(recap.flaggedUncounted).toEqual({ forced: 1, decided: 0 });
    // The invariant the recap owes its reader: the breakdown IS the gap.
    const { forced, decided } = recap.flaggedUncounted;
    expect(forced + decided).toBe(recap.flaggedMoves - recap.countedErrors);
  });

  it("leaves the breakdown at zero when every flagged Move is counted", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), REGIME);

    expect(recap.flaggedUncounted).toEqual({ forced: 0, decided: 0 });
    expect(recap.flaggedMoves).toBe(recap.countedErrors);
  });

  it("counts the Player's Moves, not the Game's half-moves", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), REGIME);

    // Eight half-moves, four of them White's.
    expect(recap.playerMoves).toBe(4);
    expect(recap.countedMoves).toBe(4);
    expect(recap.excluded).toEqual({ forced: 0, decided: 0 });
  });

  it("adds up: what the flagged Moves lost, plus the Drift, IS everything lost", () => {
    // A Game with one real Blunder and a slow bleed around it.
    const recap = gameRecap(
      { playerColor: "white" },
      stored(PGN, [30, -20, 10, -40, -300, 280, -320, 300, -340]),
      REGIME,
    );

    expect(recap.flaggedLoss + recap.drift).toBeCloseTo(recap.chancesLost, 10);
    expect(recap.drift).toBeGreaterThanOrEqual(0);
  });

  it("gives the whole of what was lost to the Drift when no Move is flagged", () => {
    // Five centipawns a Move: never trips the Inaccuracy floor, and that is
    // exactly what a threshold reading is blind to.
    const recap = gameRecap(
      { playerColor: "white" },
      stored(PGN, [20, -15, 10, -5, 0, 5, -10, 15, -20]),
      REGIME,
    );

    expect(recap.countedErrors).toBe(0);
    expect(recap.drift).toBeCloseTo(recap.chancesLost, 10);
    expect(recap.chancesLost).toBeGreaterThan(0);
  });

  it("reads all zeros on a Game with nothing lost — no special case, no doubtful division", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), REGIME);

    expect(recap.chancesLost).toBe(0);
    expect(recap.flaggedLoss).toBe(0);
    expect(recap.drift).toBe(0);
    expect(recap.countedErrors).toBe(0);
  });

  it("carries the Search regime once for the Game, since a Game never mixes two", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), REGIME);

    expect(recap.regime).toEqual(REGIME);
  });

  it("says a Game with no analysis pass behind it has an unknown regime rather than today's", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, [0, 0, 0, 0, 0, 0, 0, 0, 0]), null);

    expect(recap.regime).toBeNull();
  });
});

describe("gameRecap — flagged is not the same as counted, and the gap is the point", () => {
  it("counts a flagged Move that does not count in flaggedMoves but NOT in countedErrors", () => {
    // The Position before White's Move offers exactly one legal reply, and the
    // reply is catastrophic: flagged by the Game, held against nobody.
    const fen = "7k/8/8/8/8/8/5PPP/6rK w - - 0 1";
    const evals: StoredEvaluation[] = [
      { ply: 0, fen, cp: 300, mate: null, pv: "" },
      { ply: 1, fen: "7k/8/8/8/8/8/5PPP/6K1 b - - 0 1", cp: 900, mate: null, pv: "" },
    ];

    const recap = gameRecap({ playerColor: "white" }, evals, REGIME);

    expect(recap.flaggedMoves).toBe(1);
    expect(recap.countedErrors).toBe(0);
    expect(recap.excluded).toEqual({ forced: 1, decided: 0 });
    // ...and an excluded Move contributes none of its loss either, so the two
    // parts still add up over what IS counted.
    expect(recap.flaggedLoss + recap.drift).toBeCloseTo(recap.chancesLost, 10);
  });
});

describe("gameRecap — the recap IS the sum of what the Moves carry", () => {
  it("equals the per-Move figures served with the annotations, on a Game with real losses", async () => {
    const { gameAnnotations } = await import("../src/analysis/derivation");
    const evals = stored(PGN, [30, -20, 10, -40, -300, 280, -320, 300, -340]);
    const game = { playerColor: "white" as const };

    const recap = gameRecap(game, evals, REGIME);
    const carried = gameAnnotations(game, evals)
      .map((a) => a.chancesLost ?? 0)
      .reduce((sum, lost) => sum + lost, 0);

    // Not "close enough": the aggregate is this sum, so it is the same number or
    // the reconciliation ADR-0017 rests on is already broken at one Game.
    expect(carried).toBe(recap.chancesLost);
  });
});

/**
 * The opponent's block (US-30, ADR-0034). Every figure below is anchored on the
 * stored rows the test hands in — never on a number read back from the app.
 *
 * `OFFERED` is built so each of the three severities is reached from a fresh
 * even Position, far from both band edges: Black (the opponent) is at 50 before
 * each of their Moves, and leaves White at +300 (a 25-point drop for Black — a
 * `Mistake`), then +900 (46 points — a `Blunder`), then +100 (9 points — an
 * `Inaccuracy`), then nothing at all.
 */
const OFFERED = [0, 0, 300, 0, 900, 0, 100, 0, 0];

describe("gameRecap — what the opponent offered, beside the Player's counts", () => {
  it("carries a named block of Opportunities: a total and its breakdown by severity", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, OFFERED), REGIME);

    expect(recap.opportunities).toEqual({
      total: 3,
      bySeverity: { inaccuracy: 1, mistake: 1, blunder: 1 },
    });
  });

  it("has a breakdown that sums to its own total — checked, never eyeballed", () => {
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, OFFERED), REGIME);
    const { inaccuracy, mistake, blunder } = recap.opportunities.bySeverity;

    expect(inaccuracy + mistake + blunder).toBe(recap.opportunities.total);
  });

  it("leaves EVERY Player figure untouched on the very same rows", () => {
    // The contamination ADR-0034 exists to prevent: a count of opponent flaws
    // reaching `countedErrors`. Asserted on the same input that produces three
    // Opportunities, so the two subjects are provably beside each other.
    const recap = gameRecap({ playerColor: "white" }, stored(PGN, OFFERED), REGIME);

    // White plays four Moves; the first loses nothing, the other three are the
    // mirror of Black's own drops and are all counted.
    expect(recap.playerMoves).toBe(4);
    expect(recap.countedMoves).toBe(4);
    expect(recap.flaggedMoves).toBe(3);
    expect(recap.countedErrors).toBe(3);
    expect(recap.excluded).toEqual({ forced: 0, decided: 0 });
    expect(recap.flaggedUncounted).toEqual({ forced: 0, decided: 0 });
    // The invariant the whole fold rests on, on a Game that now also has a block.
    expect(recap.flaggedLoss + recap.drift).toBeCloseTo(recap.chancesLost, 9);
    // And the loss figures are pinned, not merely positive: White's only losing
    // Moves ARE the three flagged ones (their first Move loses nothing), so the
    // whole loss is flagged and the residual is zero. A change that moved the
    // figures while keeping the invariant would slip past a `> 0`.
    expect(recap.chancesLost).toBeGreaterThan(0);
    expect(recap.flaggedLoss).toBe(recap.chancesLost);
    expect(recap.drift).toBe(0);
  });

  it("reads the SAME source as the annotations, rather than counting a second time", () => {
    const game = { playerColor: "white" as const };
    const evals = stored(PGN, OFFERED);

    const recap = gameRecap(game, evals, REGIME);
    const onAnnotations = gameAnnotations(game, evals).filter((a) => a.opportunity !== null);

    expect(onAnnotations.length).toBe(recap.opportunities.total);
    for (const severity of ["inaccuracy", "mistake", "blunder"] as const) {
      expect(onAnnotations.filter((a) => a.opportunity?.severity === severity).length).toBe(
        recap.opportunities.bySeverity[severity],
      );
    }
  });

  it("counts a FORCED opponent Move, which no Player figure would count", () => {
    // White is in check and `Kxg1` is their only legal Move — and it collapses.
    // The Player is Black here, so this is the opponent's Move: forced, and
    // still an Opportunity (CONTEXT.md — the asymmetry is the point).
    const SOLE_LEGAL = "7k/8/8/8/8/8/5PPP/6rK w - - 0 1";
    const AFTER = "7k/8/8/8/8/8/5PPP/6K1 b - - 0 1";
    const evals: StoredEvaluation[] = [
      { ply: 0, fen: SOLE_LEGAL, cp: 120, mate: null, pv: "" },
      { ply: 1, fen: AFTER, cp: 900, mate: null, pv: "" },
    ];

    const recap = gameRecap({ playerColor: "black" }, evals, REGIME);

    expect(recap.opportunities).toEqual({
      total: 1,
      bySeverity: { inaccuracy: 0, mistake: 0, blunder: 1 },
    });
    // And nothing of the Player's moved: they have not played yet.
    expect(recap.playerMoves).toBe(0);
    expect(recap.flaggedMoves).toBe(0);
    expect(recap.countedErrors).toBe(0);
  });

  it("offers nothing on a Position already decided against the opponent", () => {
    // Black (the opponent) is at cp -900 before their Move: under the decided
    // floor, there was nothing left there to take.
    const recap = gameRecap(
      { playerColor: "white" },
      stored(PGN, [0, -900, 900, 0, 0, 0, 0, 0, 0]),
      REGIME,
    );

    expect(recap.opportunities).toEqual({
      total: 0,
      bySeverity: { inaccuracy: 0, mistake: 0, blunder: 0 },
    });
  });
});

/**
 * The damage, **located** (US-32, ticket 02). The Game below is a **fabricated
 * fixture** and says so: the base carries no analysed Game short enough to pin
 * three Phases by hand, and the honesty reserve of the spec asks for the word.
 *
 * Nine Positions, written out rather than replayed from a PGN, because what is
 * being fixed is the **Phase sequence** and a PGN reaching it would only hide
 * that: three Positions in the Early game, three in the Middlegame, three in the
 * Endgame. White is the Player, so their Moves land on the odd plies — one in
 * the Early game, two in the Middlegame, one in the Endgame — and the
 * opponent's on the even ones.
 */
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
/** Seven majors and minors: past the Middlegame boundary, short of the Endgame. */
const MIDDLE = "r2qk2r/pppppppp/2n5/8/8/8/PPPPPPPP/R2QK2R";
/** Two: the Endgame boundary, by a count anyone can check by eye. */
const END = "4k3/pppppppp/8/8/8/8/PPPPPPPP/R3K2R";

const THREE_PHASES = [START, START, START, MIDDLE, MIDDLE, MIDDLE, END, END, END];

/** Stored rows over an explicit Position sequence; `cp` is side-to-move
 *  relative, as stored. */
function overFens(fens: string[], cps: number[]): StoredEvaluation[] {
  return cps.map((cp, ply) => ({
    ply,
    fen: `${fens[ply]} ${ply % 2 === 0 ? "w" : "b"} - - 0 ${ply + 1}`,
    cp,
    mate: null,
    pv: "",
  }));
}

/** Losses spread over the three Phases, with the opponent giving something back
 *  in the Middlegame: White drifts early, blunders in the Middlegame, bleeds
 *  again, and drops the Endgame. */
const SPREAD = [0, 20, 60, 500, -400, 600, -150, 800, -900];

describe("gameRecap — WHERE the Game was lost: the damage by Phase", () => {
  const game = { playerColor: "white" as const };
  const evals = overFens(THREE_PHASES, SPREAD);

  it("holds the identity `flaggedLoss + drift = chancesLost` in EVERY Phase it reached", () => {
    const recap = gameRecap(game, evals, REGIME);

    for (const phase of ["early", "middlegame", "endgame"] as const) {
      const band = recap.byPhase[phase];
      expect(band).not.toBeNull();
      expect(band!.flaggedLoss + band!.drift).toBeCloseTo(band!.chancesLost, 9);
    }
  });

  it("sums back to the totals the recap already showed — the breakdown is a FOLD, not a second reading", () => {
    const recap = gameRecap(game, evals, REGIME);
    const bands = Object.values(recap.byPhase).filter((band) => band !== null);
    const sum = (read: (band: NonNullable<typeof bands[number]>) => number) =>
      bands.reduce((total, band) => total + read(band!), 0);

    expect(sum((b) => b.chancesLost)).toBeCloseTo(recap.chancesLost, 9);
    expect(sum((b) => b.flaggedLoss)).toBeCloseTo(recap.flaggedLoss, 9);
    expect(sum((b) => b.drift)).toBeCloseTo(recap.drift, 9);
    expect(sum((b) => b.countedErrors)).toBe(recap.countedErrors);
  });

  it("splits what was DROPPED from what was BLED, per Phase — two opposite lessons a total would melt", () => {
    const recap = gameRecap(game, evals, REGIME);

    // The Middlegame carries a flagged Move; the Early game only bleeds.
    expect(recap.byPhase.middlegame!.flaggedLoss).toBeGreaterThan(0);
    expect(recap.byPhase.early!.flaggedLoss).toBe(0);
    expect(recap.byPhase.early!.drift).toBeGreaterThan(0);
  });

  it("keeps the opponent's Opportunities in a column of their own, never added to the Player's damage", () => {
    const recap = gameRecap(game, evals, REGIME);
    const offered = (["early", "middlegame", "endgame"] as const).reduce(
      (total, phase) => total + (recap.byPhase[phase]?.opportunities.total ?? 0),
      0,
    );

    // They fold to the Game's own block — and to nothing else (ADR-0034).
    expect(offered).toBe(recap.opportunities.total);
    expect(offered).toBeGreaterThan(0);
    // The Player's figures on the same rows are the Player's alone.
    const damage = (["early", "middlegame", "endgame"] as const).reduce(
      (total, phase) => total + (recap.byPhase[phase]?.countedErrors ?? 0),
      0,
    );
    expect(damage).toBe(recap.countedErrors);
  });

  it("reads the SAME Phase the annotations carry, rather than deciding a second time", () => {
    const recap = gameRecap(game, evals, REGIME);
    const carried = gameAnnotations(game, evals);

    for (const phase of ["early", "middlegame", "endgame"] as const) {
      const lost = carried
        .filter((a) => a.phase === phase)
        .reduce((total, a) => total + (a.chancesLost ?? 0), 0);
      expect(recap.byPhase[phase]!.chancesLost).toBeCloseTo(lost, 9);
    }
  });

  it("names a Phase the Game NEVER REACHED as not reached — never as a zero", () => {
    // 19 of the 78 analysed Games have no Endgame: a `0` there would read as
    // "none of your damage was in the Endgame", which is a false strength.
    // A Game that stays in the opening: nothing traded, back ranks full, the
    // armies never meet. FABRICATED fixture.
    const recap = gameRecap(game, overFens([START, START, START], [0, -40, 40]), REGIME);

    expect(recap.byPhase.early).not.toBeNull();
    expect(recap.byPhase.middlegame).toBeNull();
    expect(recap.byPhase.endgame).toBeNull();
  });

  it("distinguishes a Phase reached with no damage from one never reached", () => {
    // The whole point of the `null`: an Endgame the Player crossed cleanly is a
    // real zero, and it must not read like an Endgame that never happened.
    const recap = gameRecap(game, overFens(THREE_PHASES, [0, 0, 0, 0, 0, 0, 0, 0, 0]), REGIME);

    expect(recap.byPhase.endgame).not.toBeNull();
    expect(recap.byPhase.endgame!.chancesLost).toBe(0);
  });
});

/**
 * **Which configuration** cost the Game (US-32, ticket 03). The Positions below
 * are a **FABRICATED** fixture and say so: the base's analysed Games reach the
 * Endgame through four configurations on average, none of them short enough to
 * pin by hand, and the spec's honesty reserve asks for the word.
 *
 * Nine Positions again — three in the Early game, then an Endgame entered at
 * ply 3 and crossing three configurations, two half-moves each. White is the
 * Player, so their Moves land on the odd plies: one before the Endgame, then one
 * in each of the three configurations.
 */
/** Two rooks against a queen: the configuration that opened the story. */
const RR_VS_Q = "3qk3/pppppppp/8/8/8/8/PPPPPPPP/R3K2R";
/** The queen gone: two rooks against nothing. */
const RR_VS_NOTHING = "4k3/pppppppp/8/8/8/8/PPPPPPPP/R3K2R";
/** A rook gone too. */
const R_VS_NOTHING = "4k3/pppppppp/8/8/8/8/PPPPPPPP/4K2R";

const THREE_SIGNATURES = [
  START,
  START,
  START,
  RR_VS_Q,
  RR_VS_Q,
  RR_VS_NOTHING,
  RR_VS_NOTHING,
  R_VS_NOTHING,
  R_VS_NOTHING,
];

/** Everything dropped in `RR vs Q`, nothing in `RR vs —`, a little in `R vs —`. */
const IN_THE_ENDGAME = [0, 0, 0, 600, -600, 0, 0, 30, -30];

describe("gameRecap — WHICH configuration cost the Game: the damage by Material signature", () => {
  const game = { playerColor: "white" as const };
  const evals = overFens(THREE_SIGNATURES, IN_THE_ENDGAME);

  it("lists the configurations the Game actually crossed, in the order it crossed them", () => {
    const recap = gameRecap(game, evals, REGIME);

    expect(recap.bySignature?.map((entry) => entry.signature)).toEqual([
      "RR vs Q",
      "RR vs —",
      "R vs —",
    ]);
  });

  it("names the configuration that cost the Game, rather than dispersing the damage", () => {
    // One signature carries >= 50 % of the Endgame's damage in 41 of 47 Games
    // (ADR-0036): the view is supposed to DESIGNATE one.
    const recap = gameRecap(game, evals, REGIME);
    const worst = [...recap.bySignature!].sort((a, b) => b.chancesLost - a.chancesLost)[0];

    expect(worst.signature).toBe("RR vs Q");
    expect(worst.chancesLost).toBeGreaterThan(0);
  });

  it("sums back to the Endgame band exactly — a FOLD of the recap, not a second reading", () => {
    const recap = gameRecap(game, evals, REGIME);
    const total = recap.bySignature!.reduce((sum, entry) => sum + entry.chancesLost, 0);

    expect(total).toBeCloseTo(recap.byPhase.endgame!.chancesLost, 9);
  });

  it("keeps a configuration crossed cleanly, at zero — traversing is not the same as costing", () => {
    const recap = gameRecap(game, evals, REGIME);
    const clean = recap.bySignature!.find((entry) => entry.signature === "RR vs —");

    expect(clean).toBeDefined();
    expect(clean!.chancesLost).toBe(0);
  });

  it("reads the signature the SAME way the seam does, on the Position each Move led to", () => {
    const recap = gameRecap(game, evals, REGIME);

    expect(recap.bySignature!.map((entry) => entry.signature)).toEqual([
      signature(`${RR_VS_Q} w - - 0 1`, "white"),
      signature(`${RR_VS_NOTHING} w - - 0 1`, "white"),
      signature(`${R_VS_NOTHING} w - - 0 1`, "white"),
    ]);
  });

  it("writes the OPPONENT's men second, so the same Game read from the other side reverses", () => {
    const recap = gameRecap({ playerColor: "black" }, evals, REGIME);

    expect(recap.bySignature?.map((entry) => entry.signature)).toEqual([
      "Q vs RR",
      "— vs RR",
      "— vs R",
    ]);
  });

  it("has NO configuration at all on a Game that never reached the Endgame — null, not empty", () => {
    // 19 of the 78 analysed Games have no Endgame. An empty list would let the
    // screen print a bare table; the absence has to be sayable. FABRICATED.
    const recap = gameRecap(game, overFens([START, START, START], [0, -40, 40]), REGIME);

    expect(recap.byPhase.endgame).toBeNull();
    expect(recap.bySignature).toBeNull();
  });
});

/**
 * The Endgame **re-entered above six pieces**, which is what makes the scope of
 * the reading a question rather than an obvious fact. FABRICATED fixture, and
 * the shape it fixes is real: `phases()` **latches** (ADR-0035), so a promotion
 * puts material back on the board and an Endgame Position can carry seven majors
 * and minors again — the same seven a pre-Endgame Position carried, and
 * therefore the **same signature**.
 *
 * Six Positions: the Early game, two Middlegame Positions at `QRR vs QRRB`, the
 * Endgame entered at `RR vs Q`, and a promotion that brings the Player's queen
 * back to `QRR vs QRRB`. The Player (White) loses chances in the Middlegame AND
 * in each of the two configurations, so a reading that keys on the signature
 * alone would pour the Middlegame's damage into an Endgame bucket.
 */
/** Seven majors and minors: past the Middlegame boundary, short of the Endgame. */
const SEVEN = "1rbqk2r/8/8/8/8/8/8/R2QK2R";
/** Three: the Endgame, by a count anyone can check by eye. */
const THREE = "3qk3/8/8/8/8/8/8/R3K2R";
/** Back to seven, after promotions — an Endgame Position by latching. */
const SEVEN_AGAIN = SEVEN;

describe("gameRecap — the signature is read on ENDGAME half-moves, and on no others", () => {
  const game = { playerColor: "white" as const };
  const evals = overFens(
    [START, SEVEN, SEVEN, THREE, THREE, SEVEN_AGAIN],
    [0, 100, -100, 200, -200, 300],
  );

  it("does not pour a MIDDLEGAME loss into an Endgame bucket that happens to share its signature", () => {
    const recap = gameRecap(game, evals, REGIME);

    // The fixture only bites if the Middlegame really lost something.
    expect(recap.byPhase.middlegame!.chancesLost).toBeGreaterThan(0);
    const total = recap.bySignature!.reduce((sum, entry) => sum + entry.chancesLost, 0);
    expect(total).toBeCloseTo(recap.byPhase.endgame!.chancesLost, 9);
  });

  it("gives a configuration BORN AFTER the boundary only what was lost in it", () => {
    // The reading ADR-0036 exists for: an imbalance is born mid-Game, and here
    // `QRR vs QRRB` exists on both sides of the Endgame boundary.
    const recap = gameRecap(game, evals, REGIME);
    const reborn = recap.bySignature!.find((entry) => entry.signature === "QRR vs QRRB");

    expect(reborn).toBeDefined();
    expect(reborn!.chancesLost).toBeLessThan(recap.byPhase.middlegame!.chancesLost + reborn!.chancesLost);
    expect(reborn!.chancesLost).toBeGreaterThan(0);
  });
});
