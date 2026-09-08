import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { games, evaluations, profiles, moveHabits } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { refreshClocks, MovetextChanged } from "../src/repair/refresh-clocks";
import type { RefreshedGame } from "../src/repair/refresh-clocks";

/**
 * The one-off refresh of US-15b (slice 05): 434 already-imported Lichess Games
 * gain the `[%clk]` nobody ever asked the export for, and **10 of them are
 * already analysed**.
 *
 * **The assertion IS the protection** (ADR-0030). Identical moves yield
 * identical FENs, so those `Evaluation`s survive a PGN replacement — but that is
 * a *claim*, and comparing the movetext is what turns it into a checked one.
 * ADR-0015 does not cover this: it governs changes of **schema**, and this is a
 * change of **data**. Nothing rebuilds an `Evaluation` but engine time.
 */

function dbWithLichessGame(over: { pgn?: string; analyzed?: boolean } = {}) {
  const { db } = openDb(":memory:");
  const profile = db
    .insert(profiles)
    .values({ platform: "lichess", username: "Metalyst", createdAt: "2026-01-01" })
    .returning()
    .get();
  const game = db
    .insert(games)
    .values({
      profileId: profile.id,
      gameUrl: "https://lichess.org/abcd1234",
      pgn: over.pgn ?? "1. e4 e5 2. Nf3 Nc6 1/2-1/2",
      opponent: "opp",
      playerColor: "white",
      result: "draw",
      date: "2026-01-01",
      timeControlCategory: "blitz",
      analyzed: over.analyzed ?? true,
      moveHabitsComputed: true,
    })
    .returning()
    .get();
  // What must survive, untouched: the FEN, the score and the `Best line`.
  db.insert(evaluations)
    .values({ gameId: game.id, ply: 0, fen: "start-fen", cp: 21, mate: null, pv: "e2e4 e7e5" })
    .run();
  return { db, game, profileId: profile.id };
}

/** What the refresh is handed for one Game: the same Moves, now with clocks. */
const withClocks: RefreshedGame = {
  gameUrl: "https://lichess.org/abcd1234",
  pgn: "1. e4 {[%clk 0:03:00]} e5 {[%clk 0:03:00]} 2. Nf3 {[%clk 0:02:59]} Nc6 {[%clk 0:02:58]} 1/2-1/2",
  lastClockCs: 4_653,
  divisionMiddlePly: 20,
  divisionEndPly: 54,
};

describe("refreshClocks", () => {
  it("replaces the PGN when the movetext is identical", () => {
    const { db, game } = dbWithLichessGame();

    const result = refreshClocks(db, [withClocks]);

    expect(result.changed).toBe(1);
    const stored = db.select().from(games).where(eq(games.id, game.id)).get()!;
    expect(stored.pgn).toContain("[%clk 0:03:00]");
  });

  it("leaves the Game's Evaluations untouched — same FEN, same score, same Best line", () => {
    const { db, game } = dbWithLichessGame();

    refreshClocks(db, [withClocks]);

    // The whole reason the refresh is allowed near this Game at all.
    const stored = db.select().from(evaluations).where(eq(evaluations.gameId, game.id)).get()!;
    expect(stored).toMatchObject({ ply: 0, fen: "start-fen", cp: 21, pv: "e2e4 e7e5" });
  });

  it("writes the last Clock and the two division plies at the same time", () => {
    const { db, game } = dbWithLichessGame();

    refreshClocks(db, [withClocks]);

    const stored = db.select().from(games).where(eq(games.id, game.id)).get()!;
    expect(stored.lastClockCs).toBe(4_653);
    expect(stored.divisionMiddlePly).toBe(20);
    expect(stored.divisionEndPly).toBe(54);
  });

  it("keeps the Game's id, so nothing is ever delete-and-reinserted", () => {
    // A delete/reinsert would break the `evaluations` foreign key and re-count
    // the Game's `Move habit`s — both silently (ADR-0030).
    const { db, game } = dbWithLichessGame();

    refreshClocks(db, [withClocks]);

    const stored = db.select().from(games).where(eq(games.gameUrl, withClocks.gameUrl)).get()!;
    expect(stored.id).toBe(game.id);
  });

  it("does not re-count the Move habits", () => {
    const { db, profileId } = dbWithLichessGame();
    db.insert(moveHabits)
      .values({ profileId, fen: "start-fen", side: "white", san: "e4", count: 7, win: 3, draw: 2, loss: 2 })
      .run();

    refreshClocks(db, [withClocks]);

    const habit = db.select().from(moveHabits).where(eq(moveHabits.fen, "start-fen")).get()!;
    // Pre-aggregated counters (ADR-0005): identical before and after.
    expect(habit.count).toBe(7);
    const stored = db.select().from(games).where(eq(games.gameUrl, withClocks.gameUrl)).get()!;
    expect(stored.moveHabitsComputed).toBe(true);
  });

  describe("when the movetext differs", () => {
    const differentMoves: RefreshedGame = {
      ...withClocks,
      pgn: "1. d4 {[%clk 0:03:00]} d5 {[%clk 0:03:00]} 1/2-1/2",
    };

    it("fails loudly rather than overwriting", () => {
      const { db } = dbWithLichessGame();

      expect(() => refreshClocks(db, [differentMoves])).toThrow(MovetextChanged);
    });

    it("writes NOTHING — not for this Game, and not for the others in the batch", () => {
      const { db, game } = dbWithLichessGame();

      expect(() => refreshClocks(db, [withClocks, differentMoves])).toThrow(MovetextChanged);

      // One transaction: a partially applied refresh on rows nobody can list
      // afterwards is worse than none at all.
      const stored = db.select().from(games).where(eq(games.id, game.id)).get()!;
      expect(stored.pgn).not.toContain("[%clk");
      expect(stored.lastClockCs).toBeNull();
    });

    it("names the Game it refused, so the refusal can be acted on", () => {
      const { db } = dbWithLichessGame();

      expect(() => refreshClocks(db, [differentMoves])).toThrow(/abcd1234/);
    });
  });

  it("ignores the comments when comparing — they are exactly what is being added", () => {
    // The comparison is of the MOVES. Comparing the raw strings would refuse
    // every Game, which is the one way this safeguard could be useless while
    // looking present.
    const { db } = dbWithLichessGame();

    expect(() => refreshClocks(db, [withClocks])).not.toThrow();
  });

  it("is idempotent: a Game that already carries its clocks is left alone", () => {
    const { db, game } = dbWithLichessGame({ pgn: withClocks.pgn });

    const result = refreshClocks(db, [withClocks]);

    expect(result.changed).toBe(0);
    expect(result.alreadyDone).toBe(1);
    const stored = db.select().from(games).where(eq(games.id, game.id)).get()!;
    expect(stored.pgn).toBe(withClocks.pgn);
  });

  it("refreshes a Game the engine has never seen, like any other", () => {
    // The refresh covers ALL 434 Lichess Games, not only the analysed ones —
    // and not only blitz + rapid. A partial refresh would make "no clock" mean
    // two things at once.
    const { db } = dbWithLichessGame({ analyzed: false });

    expect(refreshClocks(db, [withClocks]).changed).toBe(1);
  });

  it("says so rather than failing when the batch names a Game the database lacks", () => {
    const { db } = dbWithLichessGame();

    const result = refreshClocks(db, [
      withClocks,
      { ...withClocks, gameUrl: "https://lichess.org/notimported" },
    ]);

    // Not an error: the export answers for the account, and it may legitimately
    // return a Game that was never imported (a variant, a game from a position).
    expect(result.changed).toBe(1);
    expect(result.notImported).toBe(1);
  });
});
