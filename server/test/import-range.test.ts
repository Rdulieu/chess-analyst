import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { listGames } from "../src/repository";
import { importRange } from "../src/import";
import { chessComGame, fakeClient } from "./fixtures";
import type { ImportRangeParams } from "../src/import";

const params = (over: Partial<ImportRangeParams> = {}): ImportRangeParams => ({
  username: "me",
  from: { year: 2024, month: 1 },
  to: { year: 2024, month: 1 },
  categories: ["blitz"],
  ...over,
});

describe("importRange", () => {
  it("imports the month's Games when both bounds are the same month", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient({ "2024-01": [chessComGame()] });

    const result = await importRange(db, client, params());

    expect(result.imported).toBe(1);
    expect(listGames(db)).toHaveLength(1);
  });

  it("covers every month of the range in order and consolidates their figures", async () => {
    const { db } = openDb(":memory:");
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
      ...params(),
      to: { year: 2024, month: 2 },
      from: { year: 2023, month: 12 },
      categories: ["blitz", "rapid"],
    });

    expect(asked).toEqual(["2023-12", "2024-01", "2024-02"]);
    expect(result.imported).toBe(3);
    expect(result.byCategory).toMatchObject({ blitz: 1, rapid: 2 });
    expect(result.results).toEqual({ win: 2, draw: 0, loss: 1 });
    expect(listGames(db)).toHaveLength(3);
  });

  it("adds nothing on a replay of the same range and counts the Games as already present", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient({ "2024-01": [chessComGame()], "2024-02": [chessComGame()] });
    const range: ImportRangeParams = { ...params(), to: { year: 2024, month: 2 } };

    await importRange(db, client, range);
    const replay = await importRange(db, client, range);

    expect(replay.imported).toBe(0);
    expect(replay.alreadyPresent).toBe(2);
    expect(listGames(db)).toHaveLength(2);
  });

  it("reports nothing found over the whole range, not month by month", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient({});

    const result = await importRange(db, client, { ...params(), to: { year: 2024, month: 3 } });

    expect(result.message).toBe("No games found for 2024-01 to 2024-03 in the selected time control categories.");
  });

  it("says nothing when at least one month of the range brought Games in", async () => {
    const { db } = openDb(":memory:");
    const client = fakeClient({ "2024-03": [chessComGame()] });

    const result = await importRange(db, client, { ...params(), to: { year: 2024, month: 3 } });

    expect(result.message).toBeUndefined();
  });
});
