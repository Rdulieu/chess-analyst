import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { openDb } from "../src/db";
import { evaluations, games, type NewGame } from "../src/db/schema";
import { getGameAnnotations } from "../src/annotations/repository";
import { gamePositions } from "../src/chess/positions";
import { fixtureBestLine } from "../src/engine/fixture";
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
  it("totals the games and the win/draw/loss tally over all Games", async () => {
    const db = tempDb();
    seed(db, { result: "win" });
    seed(db, { result: "loss" });
    seed(db, { result: "draw" });

    const stats = await getStats(db, PROFILE);

    expect(stats.total.games).toBe(3);
    expect([stats.total.win, stats.total.draw, stats.total.loss]).toEqual([1, 1, 1]);
  });

  it("computes the Win rate with standard scoring, and null when there are no Games", async () => {
    const db = tempDb();
    expect((await getStats(db, PROFILE)).total.winRate).toBeNull(); // empty history: no rate

    seed(db, { result: "win" });
    seed(db, { result: "draw" });
    // (1 win + 0.5·1 draw) / 2 games = 0.75
    expect((await getStats(db, PROFILE)).total.winRate).toBe(0.75);
  });

  it("breaks the results down per cadence, with all four cadences always present", async () => {
    const db = tempDb();
    seed(db, { result: "win", timeControlCategory: "blitz" });
    seed(db, { result: "loss", timeControlCategory: "blitz" });
    seed(db, { result: "win", timeControlCategory: "bullet" });

    const { byCategory } = await getStats(db, PROFILE);

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

  it("breaks the results down by the side the Player played", async () => {
    const db = tempDb();
    seed(db, { result: "win", playerColor: "white" });
    seed(db, { result: "loss", playerColor: "white" });
    seed(db, { result: "draw", playerColor: "black" });

    const { bySide } = await getStats(db, PROFILE);

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
  it("counts a Game once per configuration crossed, in results", async () => {
    const db = tempDb();
    seed(db, { result: "win", pgn: TWO_ROOKS });
    seed(db, { result: "loss", pgn: TWO_ROOKS });
    seed(db, { result: "draw", pgn: TWO_ROOKS });

    expect((await getStats(db, PROFILE)).signatures.rows).toEqual([
      { signature: "RR vs —", delta: 10, games: 3, win: 1, draw: 1, loss: 1, winRate: 0.5 },
    ]);
  });

  it("reads the configuration from the side the Player played", async () => {
    const db = tempDb();
    for (const result of ["win", "loss", "draw"] as const) {
      seed(db, { result, pgn: TWO_ROOKS, playerColor: "black" });
    }
    expect((await getStats(db, PROFILE)).signatures.rows.map((r) => r.signature)).toEqual(["— vs RR"]);
  });

  it("relegates what is under the bar and announces the table's scope", async () => {
    const db = tempDb();
    seed(db, { result: "win", pgn: TWO_ROOKS });
    seed(db, { result: "loss", pgn: TWO_ROOKS });
    seed(db, { result: "loss", pgn: TWO_ROOKS });
    seed(db, { result: "win", pgn: ONE_ROOK });
    seed(db, { result: "win", pgn: NO_ENDGAME });

    const { signatures } = await getStats(db, PROFILE);

    expect(signatures.threshold).toBe(3);
    expect(signatures.rows.map((r) => r.signature)).toEqual(["RR vs —"]);
    expect(signatures.below.configurations).toBe(1);
    expect(signatures.scope).toEqual({
      games: 5,
      withEndgame: 4,
      withoutEndgame: 1,
      unreadable: 0,
    });
  });

  it("stays within the Profile asked for (ADR-0014)", async () => {
    const db = tempDb();
    // The Profile under test exists first, so it is the one `PROFILE` names.
    expect(seedProfile(db)).toBe(PROFILE);
    const other = seedProfile(db, "someone-else", "lichess");
    for (const result of ["win", "loss", "draw"] as const) {
      seed(db, { result, pgn: TWO_ROOKS, profileId: other });
    }

    expect((await getStats(db, PROFILE)).signatures.scope).toEqual({
      games: 0,
      withEndgame: 0,
      withoutEndgame: 0,
      unreadable: 0,
    });
    expect((await getStats(db, other)).signatures.rows).toHaveLength(1);
  });
});

/**
 * One analysed Game the damage table can read: a FABRICATED Endgame (US-32
 * spec) whose Evaluations make White throw a won Position away, so the Game has
 * chances lost to attribute.
 */
function seedAnalysed(db: ReturnType<typeof tempDb>) {
  seed(db, { result: "loss", pgn: TWO_ROOKS, analyzed: true });
  const game = db.select().from(games).all().at(-1)!;
  // A stored cp is read from the side to MOVE (see `countedMoves`), so a
  // constant +300 means whoever is on move is winning — i.e. the mover throws
  // it away every single half-move. All of it lands in the Endgame, which is
  // the only Phase this fabricated Position ever has.
  const scores = [300, 300, 300, 300, 300];
  for (const [ply, fen] of gamePositions(game.pgn).entries()) {
    db.insert(evaluations)
      .values({ gameId: game.id, ply, fen, cp: scores[ply], mate: null, pv: fixtureBestLine(fen).join(" ") })
      .run();
  }
  return game;
}

describe("getStats — the two Phase tables (US-32, ADR-0036's amendment)", () => {
  it("files each Game under the Phase it ENDED in, over the whole history", async () => {
    const db = tempDb();
    // TWO_ROOKS starts from an Endgame Position; NO_ENDGAME never leaves the start.
    seed(db, { result: "win", pgn: TWO_ROOKS });
    seed(db, { result: "loss", pgn: TWO_ROOKS });
    seed(db, { result: "win", pgn: NO_ENDGAME });

    const { phaseResults } = await getStats(db, PROFILE);

    expect(phaseResults.games).toBe(3);
    expect(phaseResults.unreadable).toBe(0);
    expect(phaseResults.rows.map((r) => [r.phase, r.games])).toEqual([
      ["early", 1],
      ["middlegame", 0],
      ["endgame", 2],
    ]);
    expect(phaseResults.rows[2]).toMatchObject({ win: 1, loss: 1, winRate: 0.5, share: 67 });
    // One Game ends in one Phase: the column IS the whole, unlike the table above.
    expect(phaseResults.rows.reduce((sum, r) => sum + r.share, 0)).toBe(100);
  });

  it("counts a PGN it cannot replay apart, in neither table's rows", async () => {
    const db = tempDb();
    seed(db, { result: "win", pgn: TWO_ROOKS });
    seed(db, { result: "loss", pgn: "[FEN \"not a position\"]\n\n1. Zz9 *" });

    const { phaseResults } = await getStats(db, PROFILE);

    expect(phaseResults.unreadable).toBe(1);
    expect(phaseResults.filed).toBe(1);
    expect(phaseResults.games).toBe(2);
  });

  it("reads the damage table over the ANALYSED Games only, and says the gap", async () => {
    const db = tempDb();
    seed(db, { result: "win", pgn: TWO_ROOKS });
    seed(db, { result: "loss", pgn: TWO_ROOKS });

    const { phaseDamage } = await getStats(db, PROFILE);

    expect(phaseDamage.games).toBe(2);
    expect(phaseDamage.analysed).toBe(0);
    expect(phaseDamage.rows.every((r) => r.meanShare === null)).toBe(true);
  });

  it("folds an analysed Game through the SAME recap the Game page shows", async () => {
    const db = tempDb();
    const game = seedAnalysed(db);

    const { phaseDamage } = await getStats(db, PROFILE);
    const recap = getGameAnnotations(db, game.id)!.recap!;

    expect(phaseDamage.analysed).toBe(1);
    expect(phaseDamage.undamaged).toBe(0);
    // The share the table reads is the one the Game's own block prints.
    const endgame = phaseDamage.rows[2];
    expect(endgame.reached).toBe(1);
    expect(endgame.meanShare).toBeCloseTo(recap.byPhase.endgame!.chancesLost / recap.chancesLost, 10);
    expect(endgame.medianShare).toBe(endgame.meanShare);
    expect(phaseDamage.rows.reduce((sum, r) => sum + r.dominant, 0)).toBe(1);
  });

  it("sees a Game re-analysed under this very process", async () => {
    // The damage fold is remembered between calls — it costs ~250 ms a Game —
    // and the `evaluations` rows it reads DO change in process. So the memo is
    // stamped with what was read, and this is the test of that stamp.
    const db = tempDb();
    const game = seedAnalysed(db);
    expect((await getStats(db, PROFILE)).phaseDamage.rows[2].reached).toBe(1);

    db.delete(evaluations).where(eq(evaluations.gameId, game.id)).run();
    db.insert(evaluations)
      .values({ gameId: game.id, ply: 0, fen: gamePositions(game.pgn)[0], cp: 0, mate: null, pv: "e1e2" })
      .run();

    // One Position and no Move of the Player's: nothing left to attribute.
    const again = await getStats(db, PROFILE);
    expect(again.phaseDamage.undamaged).toBe(1);
  });

  it("stays within the Profile asked for (ADR-0014)", async () => {
    const db = tempDb();
    expect(seedProfile(db)).toBe(PROFILE);
    const other = seedProfile(db, "someone-else", "lichess");
    seed(db, { result: "win", pgn: TWO_ROOKS, profileId: other });

    expect((await getStats(db, PROFILE)).phaseResults.games).toBe(0);
    expect((await getStats(db, other)).phaseResults.rows[2].games).toBe(1);
  });
});

describe("getStats — the win rate by band of material (US-32 slice 07)", () => {
  it("files the couples of the same crossings, with no second replay", async () => {
    const db = tempDb();
    for (const result of ["win", "loss", "draw"] as const) seed(db, { result, pgn: TWO_ROOKS });

    const { materialBands, signatures } = await getStats(db, PROFILE);
    // `RR vs —` is +10: the richest band, and the only one touched.
    expect(materialBands.couples).toBe(3);
    expect(materialBands.rows[6]).toMatchObject({ band: "≥ +9", games: 3, winRate: 0.5 });
    expect(materialBands.threshold).toBe(signatures.threshold);
  });

  it("keeps the configuration table's order untouched by the column", async () => {
    const db = tempDb();
    for (const result of ["win", "loss", "draw"] as const) seed(db, { result, pgn: TWO_ROOKS });
    for (const result of ["win", "loss", "draw"] as const) seed(db, { result, pgn: ONE_ROOK });
    // `RR vs —` (+10) is crossed by three Games, `R vs —` by six: most played
    // first, and the richer configuration does not climb for being richer.
    expect((await getStats(db, PROFILE)).signatures.rows.map((r) => [r.signature, r.delta])).toEqual([
      ["R vs —", 5],
      ["RR vs —", 10],
    ]);
  });
});
