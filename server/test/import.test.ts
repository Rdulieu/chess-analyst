import { describe, it, expect } from "vitest";
import { and, eq } from "drizzle-orm";
import { openDb } from "../src/db";
import { moveHabits } from "../src/db/schema";
import { listGames } from "../src/repository";
import { importMonth, importRange } from "../src/import";
import { TruncatedStreamError } from "../src/platform";
import { importedGame, fakeClient, seedProfile } from "./fixtures";

/** A fresh database with the one `Profile` these tests import under. */
function testDb() {
  const { db } = openDb(":memory:");
  return { db, profileId: seedProfile(db) };
}

/** 4-field FEN of the standard starting Position. */
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

/** The archive of the single month these importMonth tests all work on. */
const januaryOf = (games: ReturnType<typeof importedGame>[]) => fakeClient({ "2024-01": games });

describe("importMonth", () => {
  it("imports and maps a month's games into the Player's Game shape", async () => {
    const { db, profileId } = testDb();
    const client = januaryOf([importedGame({ gameUrl: "https://www.chess.com/game/live/100" })]);

    const result = await importMonth(db, client, {
      profileId,
      username: "me",
      year: 2024,
      month: 1,
      categories: ["blitz"],
    });

    expect(result.imported).toBe(1);
    const all = listGames(db, profileId);
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
    const { db, profileId } = testDb();
    const client = januaryOf([
      // Player is Black and lost.
      importedGame({
        gameUrl: "https://www.chess.com/game/live/1",
        playerColor: "black",
        opponent: "opp",
        result: "loss",
      }),
      // Player is White and drew.
      importedGame({
        gameUrl: "https://www.chess.com/game/live/2",
        playerColor: "white",
        opponent: "opp",
        result: "draw",
      }),
    ]);

    await importMonth(db, client, {
      profileId,
      username: "me",
      year: 2024,
      month: 1,
      categories: ["blitz"],
    });

    const byUrl = Object.fromEntries(listGames(db, profileId).map((g) => [g.gameUrl, g]));
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
    const { db, profileId } = testDb();
    const client = januaryOf([
      importedGame({ gameUrl: "https://www.chess.com/game/live/b", timeControlCategory: "blitz" }),
      importedGame({ gameUrl: "https://www.chess.com/game/live/x", timeControlCategory: "bullet" }),
      importedGame({ gameUrl: "https://www.chess.com/game/live/r", timeControlCategory: "rapid" }),
    ]);

    const result = await importMonth(db, client, {
      profileId,
      username: "me",
      year: 2024,
      month: 1,
      categories: ["blitz", "rapid"],
    });

    expect(result.imported).toBe(2);
    expect(
      listGames(db, profileId)
        .map((g) => g.timeControlCategory)
        .sort(),
    ).toEqual(["blitz", "rapid"]);
  });

  it("reports what the Platform HAD as fetched, not what it handed over (out-of-scope games included)", async () => {
    // The adapter drops what we do not study (variants, and later more), so the
    // month can carry fewer games than it fetched. `totalFetched` keeps meaning
    // "what the Platform had" — a month mostly out of scope must not read empty.
    const { db, profileId } = testDb();
    const client = fakeClient({
      "2024-01": {
        totalFetched: 5,
        games: [importedGame({ gameUrl: "https://www.chess.com/game/live/std" })],
      },
    });

    const result = await importMonth(db, client, {
      profileId,
      username: "me",
      year: 2024,
      month: 1,
      categories: ["blitz"],
    });

    expect(result.totalFetched).toBe(5);
    expect(result.imported).toBe(1);
    expect(listGames(db, profileId).map((g) => g.gameUrl)).toEqual([
      "https://www.chess.com/game/live/std",
    ]);
  });

  it("skips Games already retained and reports them as already present (dedup by URL)", async () => {
    const { db, profileId } = testDb();
    const client = januaryOf([
      importedGame({ gameUrl: "https://www.chess.com/game/live/a" }),
      importedGame({ gameUrl: "https://www.chess.com/game/live/b" }),
    ]);
    const params = {
      profileId,
      username: "me",
      year: 2024,
      month: 1,
      categories: ["blitz" as const],
    };

    const first = await importMonth(db, client, params);
    const second = await importMonth(db, client, params);

    expect(first).toMatchObject({ imported: 2, alreadyPresent: 0 });
    expect(second).toMatchObject({ imported: 0, alreadyPresent: 2 });
    expect(listGames(db, profileId)).toHaveLength(2);
  });

  it("reports a full summary: total fetched, per-category counts and a win/draw/loss tally", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({
      // Five games fetched, one of them out of scope and so never handed over.
      "2024-01": {
        totalFetched: 5,
        games: [
          importedGame({ gameUrl: "u1", timeControlCategory: "blitz", result: "win" }),
          importedGame({
            gameUrl: "u2",
            timeControlCategory: "blitz",
            result: "loss",
            playerColor: "black",
          }),
          importedGame({ gameUrl: "u3", timeControlCategory: "rapid", result: "draw" }),
          importedGame({ gameUrl: "u4", timeControlCategory: "bullet", result: "win" }),
        ],
      },
    });

    const result = await importMonth(db, client, {
      profileId,
      username: "me",
      year: 2024,
      month: 1,
      categories: ["bullet", "blitz", "rapid", "classical", "correspondence"],
    });

    expect(result.totalFetched).toBe(5);
    expect(result.imported).toBe(4);
    expect(result.alreadyPresent).toBe(0);
    expect(result.byCategory).toEqual({
      bullet: 1,
      blitz: 2,
      rapid: 1,
      classical: 0,
      correspondence: 0,
    });
    expect(result.results).toEqual({ win: 2, draw: 1, loss: 1 });
  });

  it("precomputes Move habit counters for each imported Game", async () => {
    const { db, profileId } = testDb();
    const client = januaryOf([
      importedGame({ pgn: "1. e4 e5", playerColor: "white", result: "win" }),
    ]);

    await importMonth(db, client, {
      profileId,
      username: "me",
      year: 2024,
      month: 1,
      categories: ["blitz"],
    });

    const e4 = db
      .select()
      .from(moveHabits)
      .where(and(eq(moveHabits.fen, START), eq(moveHabits.side, "white"), eq(moveHabits.san, "e4")))
      .get();
    expect(e4?.count).toBe(1);
  });

  it("reports zero imported with a clear message when the month has no matching games", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({}); // player exists, but no games that month

    const result = await importMonth(db, client, {
      profileId,
      username: "me",
      year: 2024,
      month: 3,
      categories: ["blitz"],
    });

    expect(result.imported).toBe(0);
    expect(result.alreadyPresent).toBe(0);
    expect(result.message).toMatch(/no games found/i);
    expect(result.message).toContain("2024-03");
    expect(listGames(db, profileId)).toHaveLength(0);
  });
});

describe("a month whose stream was cut short", () => {
  it("keeps the Games that arrived, and still reports the month a failure", async () => {
    // Two things that must hold together: the Player does not lose what already
    // came in, AND the month is not allowed to read as done. Persisting without
    // raising would be the silent hole; raising without persisting would throw
    // away Games the Platform already paid to send.
    const { db, profileId } = testDb();
    const arrived = importedGame({ gameUrl: "https://lichess.org/arrived1" });
    const client = fakeClient({
      "2024-01": new TruncatedStreamError("lichess", { totalFetched: 1, games: [arrived] }),
    });

    await expect(
      importMonth(db, client, {
        profileId,
        username: "me",
        year: 2024,
        month: 1,
        categories: ["blitz"],
      }),
    ).rejects.toThrow(TruncatedStreamError);

    expect(listGames(db, profileId).map((g) => g.gameUrl)).toEqual([
      "https://lichess.org/arrived1",
    ]);
  });

  it("does not count a cut month as covered, and says so in words", async () => {
    // The line the Player reads. An empty month reads as a plain zero; this one
    // has to say the fetch broke, or the two collapse into one.
    const { db, profileId } = testDb();
    const client = fakeClient({
      "2024-01": [importedGame({ gameUrl: "https://lichess.org/full1" })],
      "2024-02": new TruncatedStreamError("lichess", {
        totalFetched: 1,
        games: [importedGame({ gameUrl: "https://lichess.org/half1" })],
      }),
    });

    const result = await importRange(db, client, {
      profileId,
      username: "me",
      platform: "lichess",
      from: { year: 2024, month: 1 },
      to: { year: 2024, month: 2 },
      categories: ["blitz"],
    });

    expect(result.months[0].failure).toBeUndefined();
    expect(result.months[1].failure).toMatch(/interrompu|incomplet/i);
    // Kept: both the whole month's Game and the half month's.
    expect(listGames(db, profileId)).toHaveLength(2);
  });
});

describe("a cut month whose salvage itself fails", () => {
  it("still reports the truncation, not a secondary failure", async () => {
    // Persisting the partial is best-effort SALVAGE: if it blows up (a bad PGN
    // in what arrived), the truth the Player needs is still "the stream was cut
    // short and re-running fixes it" — not whatever the salvage tripped over.
    const { db, profileId } = testDb();
    const unparsable = importedGame({
      gameUrl: "https://lichess.org/broken1",
      pgn: "1. e4 Qxf7#", // illegal: no queen can move there from the start
    });
    const client = fakeClient({
      "2024-01": new TruncatedStreamError("lichess", {
        totalFetched: 1,
        games: [unparsable],
      }),
    });

    const result = await importRange(db, client, {
      profileId,
      username: "me",
      platform: "lichess",
      from: { year: 2024, month: 1 },
      to: { year: 2024, month: 1 },
      categories: ["blitz"],
    });

    expect(result.months[0].failure).toMatch(/interrompu|incomplet/i);
  });
});
