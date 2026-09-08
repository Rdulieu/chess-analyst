import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { gamePositions } from "../src/chess/positions";
import { fixtureBestLine } from "../src/engine/fixture";
import { games, evaluations, analysisPasses, type NewGame } from "../src/db/schema";
import { getGameAnnotations } from "../src/annotations/repository";
import { seedProfile } from "./fixtures";

function tempDb() {
  return openDb(":memory:").db;
}

let urlSeq = 0;
function seedGame(db: ReturnType<typeof tempDb>, game: Partial<NewGame> & Pick<NewGame, "pgn">) {
  return db
    .insert(games)
    .values({
      profileId: seedProfile(db),
      gameUrl: `https://chess.com/g/${urlSeq++}`,
      opponent: "opp",
      playerColor: "white",
      result: "win",
      date: "2026-01-01",
      timeControlCategory: "blitz",
      analyzed: true,
      ...game,
    })
    .returning()
    .get();
}

/** Stores one Evaluation the way the `Analysis pass` does — FEN included,
 *  read back from the Game's own PGN (ADR-0012). */
function seedEvaluation(
  db: ReturnType<typeof tempDb>,
  game: { id: number; pgn: string },
  ply: number,
  evaluation: { cp?: number | null; mate?: number | null },
  passId?: number,
) {
  const fen = gamePositions(game.pgn)[ply];
  db.insert(evaluations)
    .values({
      gameId: game.id,
      ply,
      fen,
      cp: evaluation.cp ?? null,
      mate: evaluation.mate ?? null,
      // A stored Evaluation always carries its `Best line` (ADR-0016), and a
      // fixture's has to be playable from the Position: it is drawn on the board
      // and replayed ply by ply by whoever reads it.
      pv: fixtureBestLine(fen).join(" "),
      passId,
    })
    .run();
}

describe("getGameAnnotations", () => {
  it("returns undefined when no Game has that id", () => {
    const db = tempDb();

    expect(getGameAnnotations(db, 999)).toBeUndefined();
  });

  it("reports analyzed:false and no plies for a not-yet-analyzed Game", () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4", analyzed: false });

    // Still distinct from an analyzed Game with nothing to say, which is the
    // whole reason `analyzed` is reported at all — and with no regime, because
    // no pass has ever run on it.
    expect(getGameAnnotations(db, game.id)).toEqual({
      analyzed: false,
      plies: [],
      regime: null,
      recap: null,
      time: {
        timeControl: null,
        // "1. e4" — one half-move, and no `[%clk]` on it. A real-time Game with
        // no clock recorded, which is a different fact from a correspondence
        // Game having none to record.
        plies: [
          { ply: 0, clockCs: null, spentCs: null },
          { ply: 1, clockCs: null, spentCs: null },
        ],
        absence: "not-recorded",
        precision: null,
        // No Clock recorded, so there is nothing to fold — and a reading at zero
        // would be a fabrication, not a summary.
        reading: null,
      },
    });
  });

  it("reports each Position's Best line, so a Move's own line and its refutation are both readable", () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5" });
    for (const ply of [0, 1, 2]) seedEvaluation(db, game, ply, { cp: 0 });

    const { plies } = getGameAnnotations(db, game.id)!;

    // The line of the Position **before** a Move is what should have been played
    // instead; the line of the Position **after** it starts with the opponent's
    // best reply and is how the Move is punished (CONTEXT.md, `Best line`). One
    // field per ply answers both — there is no second thing to store.
    const fens = gamePositions(game.pgn);
    expect(plies.map((p) => p.bestLine)).toEqual(fens.map((fen) => fixtureBestLine(fen)));
  });

  it("reports the Search regime the Game was analyzed under, so its figures can be judged", () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4" });
    const pass = db
      .insert(analysisPasses)
      .values({
        profileId: seedProfile(db),
        gameIds: [game.id],
        total: 2,
        depth: 12,
        lines: 2,
        startedAt: "2026-01-01T00:00:00Z",
        endedAt: "2026-01-01T00:01:00Z",
        outcome: "completed",
      })
      .returning()
      .get();
    for (const ply of [0, 1]) seedEvaluation(db, game, ply, { cp: 0 }, pass.id);

    expect(getGameAnnotations(db, game.id)!.regime).toEqual({ depth: 12, lines: 2 });
  });

  it("reports no regime for a Game whose Evaluations name no pass", () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4" });
    for (const ply of [0, 1]) seedEvaluation(db, game, ply, { cp: 0 });

    // Unknown provenance is stated as unknown, never guessed at from the regime
    // this app happens to run today.
    expect(getGameAnnotations(db, game.id)!.regime).toBeNull();
  });

  /**
   * The time block (US-15b). It is filled **from the PGN**, so it does not
   * depend on the engine having run — which is the whole point: `rapid` has no
   * analysed Game at all, and it is the cadence the story exists for.
   */
  describe("the time block", () => {
    it("names the exact Time control of an analyzed Game", () => {
      const db = tempDb();
      const game = seedGame(db, { pgn: '[TimeControl "180+2"]\n\n1. e4 e5 1/2-1/2' });
      seedEvaluation(db, game, 0, { cp: 0 });

      expect(getGameAnnotations(db, game.id)!.time.timeControl).toEqual({
        kind: "realtime",
        initialCs: 18_000,
        incrementCs: 200,
      });
    });

    it("names it on a Game the engine has never seen", () => {
      const db = tempDb();
      const game = seedGame(db, {
        pgn: '[TimeControl "600+5"]\n\n1. e4 e5 1/2-1/2',
        analyzed: false,
      });

      // The assertion that keeps `rapid` from showing nothing: no Evaluation
      // exists here, and the cadence is still answered.
      expect(getGameAnnotations(db, game.id)!.time.timeControl).toEqual({
        kind: "realtime",
        initialCs: 60_000,
        incrementCs: 500,
      });
    });

    it("names the days per move of a correspondence Game", () => {
      const db = tempDb();
      const game = seedGame(db, {
        pgn: '[TimeControl "1/172800"]\n\n1. e4 e5 1/2-1/2',
        timeControlCategory: "correspondence",
        analyzed: false,
      });

      expect(getGameAnnotations(db, game.id)!.time.timeControl).toEqual({
        kind: "correspondence",
        daysPerMove: 2,
      });
    });

    it("says absent, not zero, when the PGN declares no Time control", () => {
      const db = tempDb();
      const game = seedGame(db, { pgn: "1. e4 e5 1/2-1/2", analyzed: false });

      expect(getGameAnnotations(db, game.id)!.time.timeControl).toBeNull();
    });
  });

  it("returns the per-ply annotations for an analyzed Game", () => {
    const db = tempDb();
    const game = seedGame(db, { pgn: "1. e4 e5", playerColor: "white" });
    seedEvaluation(db, game, 0, { cp: 0 });
    seedEvaluation(db, game, 1, { cp: 0 });
    seedEvaluation(db, game, 2, { cp: 0 });

    const result = getGameAnnotations(db, game.id);

    expect(result?.analyzed).toBe(true);
    expect(result?.plies).toHaveLength(3);
  });
});
