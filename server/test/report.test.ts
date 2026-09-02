import { describe, it, expect } from "vitest";
import { gameReport, type StoredLine } from "../src/review/report";
import { gameRecap } from "../src/analysis/recap";
import { gamePositions } from "../src/chess/positions";

/** A Game long enough to hold a few Moves of each side. */
const PGN = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 d6";

/**
 * Stored rows for a Game whose Positions come from its own PGN — the fixture
 * idiom of `recap.test.ts`, extended with the second line's score, which is a
 * column the report reads and the recap does not. `cp` is side-to-move relative,
 * as stored.
 */
function stored(pgn: string, rows: (number | Partial<StoredLine>)[]): StoredLine[] {
  const fens = gamePositions(pgn);
  return rows.map((row, ply) => ({
    ply,
    fen: fens[ply],
    cp: 0,
    mate: null,
    pv: "",
    cp2: null,
    mate2: null,
    ...(typeof row === "number" ? { cp: row } : row),
  }));
}

const REGIME = { depth: 16, lines: 2 };

const level = (pgn: string) => stored(pgn, new Array(gamePositions(pgn).length).fill(0));

describe("The replayable report — one line per Player Move", () => {
  it("renders one line per Player Move, each NAMED as the Player can find it on the board", () => {
    const report = gameReport({ playerColor: "white", pgn: PGN }, level(PGN));

    // Four Moves out of eight half-moves — and "e4", not "ply 1": the review's
    // whole point is that a human can go and look at the Move.
    expect(report.rows.map((row) => row.san)).toEqual(["e4", "Nf3", "Bc4", "d3"]);
  });

  it("carries what the app's OWN derivation says of the Move: severity, exclusion reason, cost", () => {
    // White's `e4` walks into a Position where Black is +400 — a 31-point drop in
    // the Player's winning chances, which is a Blunder on the published bands.
    const report = gameReport({ playerColor: "white", pgn: PGN }, stored(PGN, [0, 400, 0, 0, 0, 0, 0, 0, 0]));

    expect(report.rows[0]).toMatchObject({
      san: "e4",
      severity: "blunder",
      counted: { counted: true, reason: null },
    });
    expect(report.rows[0].chancesLost).toBeCloseTo(31.35, 1);
    // And the Moves after it say what they are, rather than inheriting anything.
    expect(report.rows.slice(1).map((row) => row.severity)).toEqual([null, null, null]);
  });

  it("reconciles itself: folding the lines gives back the recap the app shows, term by term", () => {
    // A Game with one real Blunder and a slow bleed around it — `recap.test.ts`'s
    // own fixture, so the two seams speak of the same Game.
    const evals = stored(PGN, [30, -20, 10, -40, -300, 280, -320, 300, -340]);

    const report = gameReport({ playerColor: "white", pgn: PGN }, evals, { regime: REGIME });

    // The recap is CALLED, never recomputed: it is the same value the page shows.
    expect(report.recap).toEqual(gameRecap({ playerColor: "white" }, evals, REGIME));
    // And the lines add up to it. This is the assertion the whole story rests on:
    // US-15c's aggregate is this fold, so a report whose lines did not reconcile
    // would be measuring something else than what the app concludes (ADR-0017).
    expect(report.totals).toEqual({
      playerMoves: report.recap.playerMoves,
      countedMoves: report.recap.countedMoves,
      excluded: report.recap.excluded,
      flaggedMoves: report.recap.flaggedMoves,
      countedErrors: report.recap.countedErrors,
      chancesLost: report.recap.chancesLost,
      flaggedLoss: report.recap.flaggedLoss,
      drift: report.recap.drift,
    });
  });
});

describe("The five signals, on every Player Move", () => {
  /** White gives a knight for a pawn: `3.Nxe5 Nxe5`. */
  const TRADE = "1. e4 e5 2. Nf3 Nc6 3. Nxe5 Nxe5";

  it("counts material as of AFTER the opponent's reply — where `Kc7` loses its rook", () => {
    const report = gameReport({ playerColor: "white", pgn: TRADE }, level(TRADE));

    // The falsification ADR-0023 records: `13...Kc7` costs 0.36 pawn of
    // evaluation — below any inaccuracy floor, in chances and in centipawns — and
    // is a Blunder because `14.Nxh8` then takes the rook. So the reading has to
    // span the Move AND its reply; a count on the Player's own Move alone reads
    // `Nxe5` as WINNING a pawn and says nothing about the knight.
    expect(report.rows.map((row) => row.signals.material)).toEqual([0, 0, 2]);
  });

  it("reads the mate distance off the column, Player-relative: a mate AGAINST them is negative", () => {
    // Stored values are side-to-move relative (CONTEXT.md): at the Position the
    // Player moves from, `mate` is already theirs; at the Position their Move led
    // to, the opponent is to move, so `+1` there means the OPPONENT mates in one.
    const report = gameReport(
      { playerColor: "white", pgn: TRADE },
      stored(TRADE, [{ mate: -7 }, { mate: 1 }, 0, 0, 0, 0, 0]),
    );

    // "the mate went from 7 to 1" — ADR-0023's own example of a signal a Player
    // can check on the board. Spanned over the Player's OWN Move, unlike material:
    // an evaluation is a search, so it already foresees the reply, where material
    // is a board fact that only changes hands when the reply is played.
    expect(report.rows[0].signals.mate).toEqual({ before: -7, after: -1 });
  });

  it("reads the raw centipawn drop, which is the calibration the chances curve hides", () => {
    const report = gameReport(
      { playerColor: "white", pgn: TRADE },
      stored(TRADE, [50, 80, 0, 0, 0, 0, 0]),
    );

    // +50 for the Player before, then +80 for the OPPONENT after their Move: a
    // 130-centipawn drop. Kept raw beside the chances, because winning chances
    // saturate at the extremes — which is the very reason the end of a lost Game
    // is invisible to the severity bands.
    expect(report.rows[0].signals.cpDrop).toBe(130);
  });

  it("has no centipawn drop to state where the engine returned a mate instead", () => {
    const report = gameReport(
      { playerColor: "white", pgn: TRADE },
      stored(TRADE, [50, { cp: null, mate: 1 }, 0, 0, 0, 0, 0]),
    );

    // `null` is a fact here, not a gap: there IS no centipawn score for a mate,
    // and inventing one (a large number) would make the signal say something the
    // engine never said.
    expect(report.rows[0].signals.cpDrop).toBeNull();
  });

  /** The Player has one legal Move and no choice: `Kxg2`, or nothing. */
  const ONE_MOVE_FOR_WHITE = "7k/8/8/8/8/8/6q1/7K w - - 0 1";
  /** The same shape, the other way round: Black's only Move is `Kxg2`. */
  const ONE_MOVE_FOR_BLACK = "7K/8/8/8/8/8/6Q1/7k b - - 0 1";

  it("says when the Move was the only legal one — the same rule the exclusion reads", () => {
    const report = gameReport(
      { playerColor: "white", pgn: TRADE },
      stored(TRADE, [{ fen: ONE_MOVE_FOR_WHITE }, 0, 0, 0, 0, 0, 0]),
    );

    expect(report.rows[0].signals.forced).toEqual({ move: true, reply: false });
    // And the app's own exclusion, derived from the same Position, agrees — which
    // is the point of reading the signal here rather than re-deriving the reason.
    expect(report.rows[0].counted).toEqual({ counted: false, reason: "forced" });
  });

  it("says when the REPLY was forced, which is what a recapture sequence looks like", () => {
    const report = gameReport(
      { playerColor: "white", pgn: TRADE },
      stored(TRADE, [0, { fen: ONE_MOVE_FOR_BLACK }, 0, 0, 0, 0, 0]),
    );

    expect(report.rows[0].signals.forced).toEqual({ move: false, reply: true });
  });

  it("reads the gap to the SECOND line — the MultiPV 2 nobody had ever opened", () => {
    const report = gameReport(
      { playerColor: "white", pgn: TRADE },
      stored(TRADE, [{ cp: 120, cp2: 20 }, 0, 0, 0, 0, 0, 0]),
    );

    // How much the best Move was worth over the next one: a hundred centipawns
    // here, so there was very nearly one Move to play. This is the score US-15a
    // paid 2.1x of engine time for and of which only the `Best line` was used.
    expect(report.rows[0].signals.secondLine).toEqual({ gap: 100, only: false });
  });

  it("says there was no second line at all rather than reporting a gap of nothing", () => {
    const report = gameReport(
      { playerColor: "white", pgn: TRADE },
      stored(TRADE, [{ cp: 120, cp2: null, mate2: null }, 0, 0, 0, 0, 0, 0]),
    );

    // Both columns null means the Position had a single legal Move (schema) — a
    // fact about the Position, not a hole in the data, and a different statement
    // from "the two lines cannot be compared".
    expect(report.rows[0].signals.secondLine).toEqual({ gap: null, only: true });
  });
});

describe("The Phase, under both readings of the cap", () => {
  /** A deliberately passive Game: only the move cap can end its Early game. */
  const PASSIVE = `1. h4 h5 ${Array.from(
    { length: 15 },
    (_, i) => `${i + 2}. ${["Rh3 Rh6", "Rg3 Rg6"][i % 2]}`,
  ).join(" ")}`;

  it("carries both readings on every line, so the review can COUNT the difference", () => {
    const report = gameReport({ playerColor: "black", pgn: PASSIVE }, level(PASSIVE));

    // Ply 28 is Black's 14th Move — the one half-move the two readings disagree
    // about. The Phase enters no calculation today (D14); what the story owes the
    // requester is the count, not a verdict, and a line that carries both
    // readings is what makes the count a fold rather than a second derivation.
    expect(report.rows.find((row) => row.ply === 28)!.phase).toEqual({
      kept: "early",
      onNumber: "middlegame",
    });
    expect(report.rows.filter((row) => row.phase.kept !== row.phase.onNumber)).toHaveLength(1);
  });
});

describe("The opponent's severity — the same derivation, the other colour", () => {
  const TRADE = "1. e4 e5 2. Nf3 Nc6 3. Nxe5 Nxe5";

  it("states how the opponent replied, measured on the same bands as the Player", () => {
    // Black is at 50 % before their reply and at 18,65 % after it: a 31-point
    // drop, a Blunder on the published bands. It costs nothing to know —
    // `evaluations` holds one row per half-move, both colours, so the engine has
    // already searched these Positions (a correction the grill had to make: the
    // opposite belief had this feature priced at double).
    const report = gameReport({ playerColor: "white", pgn: TRADE }, stored(TRADE, [0, 0, 400, 0, 0, 0, 0]));

    expect(report.rows[0].opponentReply).toEqual({
      severity: "blunder",
      counted: { counted: true, reason: null },
    });
  });

  it("refuses to credit the opponent for a Position that was already decided", () => {
    // Black replies from 4,99 % of winning chances — under the published floor,
    // so the analysis counts nothing of it, exactly as it would for the Player.
    const report = gameReport({ playerColor: "white", pgn: TRADE }, stored(TRADE, [0, -800, 0, 0, 0, 0, 0]));

    expect(report.rows[0].opponentReply).toEqual({
      severity: null,
      counted: { counted: false, reason: "decided" },
    });
  });

  it("says the Game ended on the Player's Move rather than inventing a reply", () => {
    const short = "1. e4";
    const report = gameReport({ playerColor: "white", pgn: short }, level(short));

    expect(report.rows[0].opponentReply).toBeNull();
  });
});

describe("Replaying the report on the same rows, with another threshold", () => {
  const TRADE = "1. e4 e5 2. Nf3 Nc6 3. Nxe5 Nxe5";

  it("says which signals fire, and a threshold moves without re-analysing anything", () => {
    // ONE array of stored rows, read twice: `3.Nxe5 Nxe5` puts the Player two
    // pawns down over the exchange, which fires the material signal at a pawn and
    // not at three. This is the discipline ADR-0024 puts in place of engine
    // determinism — retune on the rows already stored, never by re-analysing, so
    // the difference between two settings is never mixed with engine noise.
    const evals = level(TRADE);

    const loose = gameReport({ playerColor: "white", pgn: TRADE }, evals);
    const strict = gameReport({ playerColor: "white", pgn: TRADE }, evals, {
      thresholds: { material: 3 },
    });

    expect(loose.rows[2].designated.material).toBe(true);
    expect(strict.rows[2].designated.material).toBe(false);
    // The threshold moved one signal and left the Move's own figures alone: the
    // severity, the denominator and the cost are the derivation's, not ours.
    expect(strict.rows[2].signals.material).toBe(2);
    expect(strict.recap).toEqual(loose.recap);
  });

  it("fires the mate signal on a mate that came CLOSER, and never on one the Player gives", () => {
    const mates = (before: number | null, after: number | null) =>
      gameReport(
        { playerColor: "white", pgn: TRADE },
        stored(TRADE, [{ cp: null, mate: before }, { cp: null, mate: after }, 0, 0, 0, 0, 0]),
      ).rows[0].designated.mate;

    // ADR-0023's own example: "the mate went from 7 to 1".
    expect(mates(-7, 1)).toBe(true);
    // A mate that ARRIVED — no larger jump exists.
    expect(mates(null, 3)).toBe(true);
    // One that receded, and one the PLAYER is giving: neither is a signal about
    // the Player's Move going wrong.
    expect(mates(-1, 7)).toBe(false);
    expect(mates(null, -2)).toBe(false);
  });
});

describe("The Moves where the mechanic gets it wrong — read, not hunted for", () => {
  const TRADE = "1. e4 e5 2. Nf3 Nc6 3. Nxe5 Nxe5";

  it("lists them in BOTH directions, so the human control is bounded to what is worth judging", () => {
    // `3.Nxe5` puts the Player two pawns down and our analysis flags nothing
    // there (the evaluation is level throughout this fixture). And an outside
    // reference is said to flag `1.e4`, which no signal designates.
    const report = gameReport({ playerColor: "white", pgn: TRADE }, level(TRADE), {
      flaggedElsewhere: [1],
    });

    // A signal fires and nobody flags it: what we would miss.
    expect(report.attention.shownByNoOne.map((row) => row.san)).toEqual(["Nxe5"]);
    // Flagged elsewhere and no signal rescues it: what no predicate would catch.
    expect(report.attention.missedBySignals!.map((row) => row.san)).toEqual(["e4"]);
    // Whole lines, not plies: the five signals of a Move are right there, which
    // is what makes the human control READ the list rather than look Moves up.
    expect(report.attention.shownByNoOne[0].signals.material).toBe(2);
  });

  it("has nothing to point at when no outside reference was given", () => {
    const report = gameReport({ playerColor: "white", pgn: TRADE }, level(TRADE));

    // A missing reference is not an empty one: with nothing to disagree with,
    // the second direction cannot be computed, and saying "none" would read as
    // "the signals caught everything".
    expect(report.attention.missedBySignals).toBeNull();
  });
});
