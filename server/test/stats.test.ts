import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { games, type NewGame } from "../src/db/schema";
import { getStats } from "../src/stats/repository";
import { seedProfile } from "./fixtures";

function tempDb() {
  return openDb(":memory:").db;
}

/** The sole `Profile` every Game below is seeded under — every read names it. */
const PROFILE = 1;

let seq = 0;
function seed(db: ReturnType<typeof tempDb>, g: Partial<NewGame> & Pick<NewGame, "result">) {
  db.insert(games)
    .values({
      profileId: seedProfile(db),
      gameUrl: `https://chess.com/g/${seq++}`,
      pgn: "1. e4 e5",
      opponent: "opp",
      playerColor: "white",
      date: "2026-01-01",
      timeControlCategory: "blitz",
      ...g,
    })
    .run();
}

describe("getStats", () => {
  it("totals the games and the win/draw/loss tally over all Games", () => {
    const db = tempDb();
    seed(db, { result: "win" });
    seed(db, { result: "loss" });
    seed(db, { result: "draw" });

    const stats = getStats(db, PROFILE);

    expect(stats.total.games).toBe(3);
    expect([stats.total.win, stats.total.draw, stats.total.loss]).toEqual([1, 1, 1]);
  });

  it("computes the Win rate with standard scoring, and null when there are no Games", () => {
    const db = tempDb();
    expect(getStats(db, PROFILE).total.winRate).toBeNull(); // empty history: no rate

    seed(db, { result: "win" });
    seed(db, { result: "draw" });
    // (1 win + 0.5·1 draw) / 2 games = 0.75
    expect(getStats(db, PROFILE).total.winRate).toBe(0.75);
  });

  it("breaks the results down per cadence, with all four cadences always present", () => {
    const db = tempDb();
    seed(db, { result: "win", timeControlCategory: "blitz" });
    seed(db, { result: "loss", timeControlCategory: "blitz" });
    seed(db, { result: "win", timeControlCategory: "bullet" });

    const { byCategory } = getStats(db, PROFILE);

    expect(byCategory.blitz).toMatchObject({ games: 2, win: 1, loss: 1, winRate: 0.5 });
    expect(byCategory.bullet).toMatchObject({ games: 1, win: 1, winRate: 1 });
    // Unplayed cadences are present at zero, with no rate.
    expect(byCategory.rapid).toEqual({ games: 0, win: 0, draw: 0, loss: 0, winRate: null });
    expect(byCategory.classical).toEqual({ games: 0, win: 0, draw: 0, loss: 0, winRate: null });
    expect(byCategory.correspondence).toEqual({
      games: 0,
      win: 0,
      draw: 0,
      loss: 0,
      winRate: null,
    });
  });

  it("breaks the results down by the side the Player played", () => {
    const db = tempDb();
    seed(db, { result: "win", playerColor: "white" });
    seed(db, { result: "loss", playerColor: "white" });
    seed(db, { result: "draw", playerColor: "black" });

    const { bySide } = getStats(db, PROFILE);

    expect(bySide.white).toMatchObject({ games: 2, win: 1, loss: 1, winRate: 0.5 });
    expect(bySide.black).toMatchObject({ games: 1, draw: 1, winRate: 0.5 });
  });
});

/**
 * FABRICATED Endgame fixtures, and named as such (US-32 spec): a PGN that starts
 * from a chosen Position, so a configuration can be made to recur the exact
 * number of times the threshold is about. The base's own Games are replayed by
 * `phase.test.ts`.
 */
function endgamePgn(fen: string, moves: string): string {
  return `[SetUp "1"]\n[FEN "${fen}"]\n\n${moves} *`;
}

/** Two rooks against a bare king, held for four plies. */
const TWO_ROOKS = endgamePgn("4k3/8/8/8/8/8/8/R3K2R w - - 0 1", "1. Rhg1 Ke7 2. Rgf1 Ke8");
/** A single rook against a bare king. */
const ONE_ROOK = endgamePgn("4k3/8/8/8/8/8/8/4K2R w - - 0 1", "1. Rg1 Ke7 2. Rf1 Ke8");
/** The opening Position and two moves: no Endgame is ever reached. */
const NO_ENDGAME = "1. e4 e5 2. Nf3 Nc6";

describe("getStats — the Material signature table", () => {
  it("counts a Game once per configuration crossed, in results", () => {
    const db = tempDb();
    seed(db, { result: "win", pgn: TWO_ROOKS });
    seed(db, { result: "loss", pgn: TWO_ROOKS });
    seed(db, { result: "draw", pgn: TWO_ROOKS });

    expect(getStats(db, PROFILE).signatures.rows).toEqual([
      { signature: "RR vs —", games: 3, win: 1, draw: 1, loss: 1, winRate: 0.5 },
    ]);
  });

  it("reads the configuration from the side the Player played", () => {
    const db = tempDb();
    for (const result of ["win", "loss", "draw"] as const) {
      seed(db, { result, pgn: TWO_ROOKS, playerColor: "black" });
    }
    expect(getStats(db, PROFILE).signatures.rows.map((r) => r.signature)).toEqual(["— vs RR"]);
  });

  it("relegates what is under the bar and announces the table's scope", () => {
    const db = tempDb();
    seed(db, { result: "win", pgn: TWO_ROOKS });
    seed(db, { result: "loss", pgn: TWO_ROOKS });
    seed(db, { result: "loss", pgn: TWO_ROOKS });
    seed(db, { result: "win", pgn: ONE_ROOK });
    seed(db, { result: "win", pgn: NO_ENDGAME });

    const { signatures } = getStats(db, PROFILE);

    expect(signatures.threshold).toBe(3);
    expect(signatures.rows.map((r) => r.signature)).toEqual(["RR vs —"]);
    expect(signatures.below.configurations).toBe(1);
    expect(signatures.scope).toEqual({ games: 5, withEndgame: 4, withoutEndgame: 1 });
  });

  it("stays within the Profile asked for (ADR-0014)", () => {
    const db = tempDb();
    // The Profile under test exists first, so it is the one `PROFILE` names.
    expect(seedProfile(db)).toBe(PROFILE);
    const other = seedProfile(db, "someone-else", "lichess");
    for (const result of ["win", "loss", "draw"] as const) {
      seed(db, { result, pgn: TWO_ROOKS, profileId: other });
    }

    expect(getStats(db, PROFILE).signatures.scope).toEqual({
      games: 0,
      withEndgame: 0,
      withoutEndgame: 0,
    });
    expect(getStats(db, other).signatures.rows).toHaveLength(1);
  });
});
