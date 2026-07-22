import { describe, it, expect } from "vitest";
import { and, eq } from "drizzle-orm";
import { openDb } from "../src/db";
import { moveHabits } from "../src/db/schema";
import { listGames } from "../src/repository";
import { importMonth, UnknownUsernameError } from "../src/import";
import type { ChessComClient, ChessComGame } from "../src/chesscom";

/** 4-field FEN of the standard starting Position. */
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

/** A chess.com game as the public API returns it, with sensible defaults. */
function chessComGame(over: Partial<ChessComGame> = {}): ChessComGame {
  return {
    url: "https://www.chess.com/game/live/100",
    pgn: "1. e4 e5",
    time_class: "blitz",
    rules: "chess",
    end_time: 1704067200, // 2024-01-01T00:00:00Z
    white: { username: "me", result: "win" },
    black: { username: "opp", result: "resigned" },
    ...over,
  };
}

/** A ChessComClient stubbed with a fixed month of games. */
function fakeClient(games: ChessComGame[], exists = true): ChessComClient {
  return {
    playerExists: async () => exists,
    fetchMonth: async () => games,
  };
}

describe("importMonth", () => {
  it("imports and maps a month's games into the Player's Game shape", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient([chessComGame()]);

    const result = await importMonth(db, client, {
      username: "me",
      year: 2024,
      month: 1,
      categories: ["blitz"],
    });

    expect(result.imported).toBe(1);
    const all = listGames(db);
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      gameUrl: "https://www.chess.com/game/live/100",
      pgn: "1. e4 e5",
      opponent: "opp",
      playerColor: "white",
      result: "win",
      date: "2024-01-01",
      timeControlCategory: "blitz",
    });
  });

  it("records the Player's side and result whether they played White or Black, won, lost or drew", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient([
      // Player is Black and lost.
      chessComGame({
        url: "https://www.chess.com/game/live/1",
        white: { username: "opp", result: "win" },
        black: { username: "Me", result: "checkmated" },
      }),
      // Player is White and drew (both sides carry a draw code).
      chessComGame({
        url: "https://www.chess.com/game/live/2",
        white: { username: "me", result: "agreed" },
        black: { username: "opp", result: "agreed" },
      }),
    ]);

    await importMonth(db, client, { username: "me", year: 2024, month: 1, categories: ["blitz"] });

    const byUrl = Object.fromEntries(listGames(db).map((g) => [g.gameUrl, g]));
    expect(byUrl["https://www.chess.com/game/live/1"]).toMatchObject({
      playerColor: "black",
      opponent: "opp",
      result: "loss",
    });
    expect(byUrl["https://www.chess.com/game/live/2"]).toMatchObject({
      playerColor: "white",
      opponent: "opp",
      result: "draw",
    });
  });

  it("keeps only the chosen time control categories", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient([
      chessComGame({ url: "https://www.chess.com/game/live/b", time_class: "blitz" }),
      chessComGame({ url: "https://www.chess.com/game/live/x", time_class: "bullet" }),
      chessComGame({ url: "https://www.chess.com/game/live/r", time_class: "rapid" }),
    ]);

    const result = await importMonth(db, client, {
      username: "me",
      year: 2024,
      month: 1,
      categories: ["blitz", "rapid"],
    });

    expect(result.imported).toBe(2);
    expect(listGames(db).map((g) => g.timeControlCategory).sort()).toEqual(["blitz", "rapid"]);
  });

  it("skips non-standard variants (rules other than 'chess')", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient([
      chessComGame({ url: "https://www.chess.com/game/live/std", rules: "chess" }),
      chessComGame({ url: "https://www.chess.com/game/live/960", rules: "chess960" }),
    ]);

    const result = await importMonth(db, client, {
      username: "me",
      year: 2024,
      month: 1,
      categories: ["blitz"],
    });

    expect(result.imported).toBe(1);
    expect(listGames(db).map((g) => g.gameUrl)).toEqual(["https://www.chess.com/game/live/std"]);
  });

  it("skips Games already retained and reports them as already present (dedup by URL)", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient([
      chessComGame({ url: "https://www.chess.com/game/live/a" }),
      chessComGame({ url: "https://www.chess.com/game/live/b" }),
    ]);
    const params = { username: "me", year: 2024, month: 1, categories: ["blitz" as const] };

    const first = await importMonth(db, client, params);
    const second = await importMonth(db, client, params);

    expect(first).toMatchObject({ imported: 2, alreadyPresent: 0 });
    expect(second).toMatchObject({ imported: 0, alreadyPresent: 2 });
    expect(listGames(db)).toHaveLength(2);
  });

  it("throws UnknownUsernameError and writes nothing when the username does not exist", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient([chessComGame()], false);

    await expect(
      importMonth(db, client, { username: "ghost", year: 2024, month: 1, categories: ["blitz"] }),
    ).rejects.toBeInstanceOf(UnknownUsernameError);
    expect(listGames(db)).toHaveLength(0);
  });

  it("reports a full summary: total fetched, per-category counts and a win/draw/loss tally", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient([
      chessComGame({ url: "u1", time_class: "blitz", white: { username: "me", result: "win" }, black: { username: "o", result: "resigned" } }),
      chessComGame({ url: "u2", time_class: "blitz", white: { username: "o", result: "win" }, black: { username: "me", result: "checkmated" } }),
      chessComGame({ url: "u3", time_class: "rapid", white: { username: "me", result: "agreed" }, black: { username: "o", result: "agreed" } }),
      chessComGame({ url: "u4", time_class: "bullet", white: { username: "me", result: "win" }, black: { username: "o", result: "timeout" } }),
      chessComGame({ url: "u5", time_class: "blitz", rules: "chess960" }), // filtered out
    ]);

    const result = await importMonth(db, client, {
      username: "me",
      year: 2024,
      month: 1,
      categories: ["bullet", "blitz", "rapid", "daily"],
    });

    expect(result.totalFetched).toBe(5);
    expect(result.imported).toBe(4);
    expect(result.alreadyPresent).toBe(0);
    expect(result.byCategory).toEqual({ bullet: 1, blitz: 2, rapid: 1, daily: 0 });
    expect(result.results).toEqual({ win: 2, draw: 1, loss: 1 });
  });

  it("precomputes Move habit counters for each imported Game", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient([
      chessComGame({
        pgn: "1. e4 e5",
        white: { username: "me", result: "win" },
        black: { username: "opp", result: "resigned" },
      }),
    ]);

    await importMonth(db, client, { username: "me", year: 2024, month: 1, categories: ["blitz"] });

    const e4 = db
      .select()
      .from(moveHabits)
      .where(and(eq(moveHabits.fen, START), eq(moveHabits.side, "white"), eq(moveHabits.san, "e4")))
      .get();
    expect(e4?.count).toBe(1);
  });

  it("reports zero imported with a clear message when the month has no matching games", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient([]); // player exists, but no games that month

    const result = await importMonth(db, client, {
      username: "me",
      year: 2024,
      month: 3,
      categories: ["blitz"],
    });

    expect(result.imported).toBe(0);
    expect(result.alreadyPresent).toBe(0);
    expect(result.message).toMatch(/no games found/i);
    expect(result.message).toContain("2024-03");
    expect(listGames(db)).toHaveLength(0);
  });
});
