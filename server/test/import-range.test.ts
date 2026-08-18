import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { listGames } from "../src/repository";
import { importRange } from "../src/import";
import { chessComGame, fakeClient, seedProfile } from "./fixtures";
import type { ImportRangeParams } from "../src/import";

/** A fresh database with the one `Profile` these tests import under. */
function testDb() {
  const { db } = openDb(":memory:");
  return { db, profileId: seedProfile(db) };
}


const params = (profileId: number, over: Partial<ImportRangeParams> = {}): ImportRangeParams => ({
  profileId,
  username: "me",
  from: { year: 2024, month: 1 },
  to: { year: 2024, month: 1 },
  categories: ["blitz"],
  ...over,
});

describe("importRange", () => {
  it("imports the month's Games when both bounds are the same month", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({ "2024-01": [chessComGame()] });

    const result = await importRange(db, client, params(profileId));

    expect(result.imported).toBe(1);
    expect(listGames(db, profileId)).toHaveLength(1);
  });

  it("covers every month of the range in order and consolidates their figures", async () => {
    const { db, profileId } = testDb();
    const asked: string[] = [];
    const client = fakeClient({
      "2023-12": [chessComGame({ time_class: "blitz" })],
      // 2024-01 left out on purpose: a month the Player was simply inactive in.
      "2024-02": [
        chessComGame({ time_class: "rapid" }),
        chessComGame({ time_class: "rapid", white: { username: "opp", result: "win" }, black: { username: "me", result: "resigned" } }),
      ],
    });
    const spying = {
      ...client,
      fetchMonth: (username: string, year: number, month: number) => {
        asked.push(`${year}-${String(month).padStart(2, "0")}`);
        return client.fetchMonth(username, year, month);
      },
    };

    const result = await importRange(db, spying, {
      ...params(profileId),
      to: { year: 2024, month: 2 },
      from: { year: 2023, month: 12 },
      categories: ["blitz", "rapid"],
    });

    expect(asked).toEqual(["2023-12", "2024-01", "2024-02"]);
    expect(result.imported).toBe(3);
    expect(result.byCategory).toMatchObject({ blitz: 1, rapid: 2 });
    expect(result.results).toEqual({ win: 2, draw: 0, loss: 1 });
    expect(listGames(db, profileId)).toHaveLength(3);
  });

  it("adds nothing on a replay of the same range and counts the Games as already present", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({ "2024-01": [chessComGame()], "2024-02": [chessComGame()] });
    const range: ImportRangeParams = { ...params(profileId), to: { year: 2024, month: 2 } };

    await importRange(db, client, range);
    const replay = await importRange(db, client, range);

    expect(replay.imported).toBe(0);
    expect(replay.alreadyPresent).toBe(2);
    expect(listGames(db, profileId)).toHaveLength(2);
  });

  it("reports one line per month of the range, in order, an inactive month included at zero", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({
      "2024-01": [chessComGame()],
      // 2024-02 left out: the Player simply did not play that month.
      "2024-03": [chessComGame(), chessComGame()],
    });

    const result = await importRange(db, client, { ...params(profileId), to: { year: 2024, month: 3 } });

    expect(result.months).toEqual([
      { month: { year: 2024, month: 1 }, imported: 1, alreadyPresent: 0 },
      { month: { year: 2024, month: 2 }, imported: 0, alreadyPresent: 0 },
      { month: { year: 2024, month: 3 }, imported: 2, alreadyPresent: 0 },
    ]);
  });

  it("carries on past a month chess.com cannot answer for, and says so on that month's line", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({
      "2024-01": [chessComGame()],
      "2024-02": new Error("chess.com request failed (429)"),
      "2024-03": [chessComGame()],
    });

    const result = await importRange(db, client, { ...params(profileId), to: { year: 2024, month: 3 } });

    // The month after the failure was still covered — the Import did not abort.
    expect(result.months.map((m) => m.month.month)).toEqual([1, 2, 3]);
    expect(result.months[1]).toMatchObject({ imported: 0, failure: expect.stringMatching(/429/) });
    expect(result.months[0].failure).toBeUndefined();
    expect(result.months[2]).toMatchObject({ imported: 1 });
    expect(listGames(db, profileId)).toHaveLength(2);
  });

  it("consolidates only the months it actually covered", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({
      "2024-01": [chessComGame()],
      "2024-02": new Error("unreachable"),
      "2024-03": [chessComGame()],
    });

    const result = await importRange(db, client, { ...params(profileId), to: { year: 2024, month: 3 } });

    expect(result.imported).toBe(2);
    expect(result.totalFetched).toBe(2);
    expect(result.message).toBeUndefined(); // a partly successful Import is not a failed one
  });

  it("catches up only the missing month when the range is replayed", async () => {
    const { db, profileId } = testDb();
    const failing = fakeClient({
      "2024-01": [chessComGame({ url: "https://chess.com/g/jan" })],
      "2024-02": new Error("unreachable"),
    });
    const recovered = fakeClient({
      "2024-01": [chessComGame({ url: "https://chess.com/g/jan" })],
      "2024-02": [chessComGame({ url: "https://chess.com/g/feb" })],
    });
    const range = { ...params(profileId), to: { year: 2024, month: 2 } };

    await importRange(db, failing, range);
    const replay = await importRange(db, recovered, range);

    expect(replay.imported).toBe(1); // only February
    expect(replay.alreadyPresent).toBe(1); // January was already retained
    expect(replay.months.every((m) => m.failure === undefined)).toBe(true);
    expect(listGames(db, profileId)).toHaveLength(2);
  });

  it("reports nothing found over the whole range, not month by month", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({});

    const result = await importRange(db, client, { ...params(profileId), to: { year: 2024, month: 3 } });

    expect(result.message).toBe("No games found for 2024-01 to 2024-03 in the selected time control categories.");
  });

  it("says nothing when at least one month of the range brought Games in", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({ "2024-03": [chessComGame()] });

    const result = await importRange(db, client, { ...params(profileId), to: { year: 2024, month: 3 } });

    expect(result.message).toBeUndefined();
  });
});
