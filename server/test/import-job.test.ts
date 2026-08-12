import { describe, it, expect, vi, afterEach } from "vitest";
import { openDb } from "../src/db";
import { listGames } from "../src/repository";
import { createImportJob } from "../src/import";
import { chessComGame, fakeClient } from "./fixtures";
import type { ImportRangeParams } from "../src/import";

afterEach(() => vi.restoreAllMocks());

const range: ImportRangeParams = {
  username: "me",
  from: { year: 2024, month: 1 },
  to: { year: 2024, month: 3 },
  categories: ["blitz"],
};

describe("createImportJob", () => {
  it("fills the summary as it goes: a month's line is there before the pass ends", async () => {
    const { db } = openDb(":memory:");
    let release!: () => void;
    const secondMonth = new Promise<void>((r) => (release = r));
    const client = fakeClient({ "2024-01": [chessComGame()], "2024-02": [chessComGame()] });
    const slow = {
      ...client,
      fetchMonth: async (u: string, y: number, m: number) => {
        if (m === 2) await secondMonth;
        return client.fetchMonth(u, y, m);
      },
    };
    const job = createImportJob(db, slow);

    job.start({ ...range, to: { year: 2024, month: 2 } });
    // Wait for January to land while February is still held.
    while (job.status().done < 1) await new Promise((r) => setTimeout(r, 5));

    const midway = job.status();
    expect(midway.running).toBe(true);
    expect(midway.result?.months).toHaveLength(1);
    expect(midway.result?.months[0]).toMatchObject({ month: { year: 2024, month: 1 }, imported: 1 });

    release();
    await job.idle();
    expect(job.status().result?.months).toHaveLength(2);
  });

  it("reports the range's months as the total and returns before the pass has run", async () => {
    const { db } = openDb(":memory:");
    const job = createImportJob(db, fakeClient({ "2024-01": [chessComGame()] }));

    const started = job.start(range);

    // The summary starts empty and fills in month by month, rather than
    // appearing all at once at the end.
    expect(started).toMatchObject({ running: true, total: 3, done: 0 });
    expect(started.result).toMatchObject({ imported: 0, months: [] });
    expect(listGames(db)).toHaveLength(0); // not awaited: nothing imported yet
    await job.idle();
  });

  it("advances to done === total and carries the consolidated summary once finished", async () => {
    const { db } = openDb(":memory:");
    const job = createImportJob(
      db,
      fakeClient({ "2024-01": [chessComGame()], "2024-03": [chessComGame()] }),
    );

    job.start(range);
    await job.idle();

    const status = job.status();
    expect(status.running).toBe(false);
    expect(status.done).toBe(3);
    expect(status.total).toBe(3);
    expect(status.result).toMatchObject({ imported: 2, alreadyPresent: 0 });
    expect(listGames(db)).toHaveLength(2);
  });

  it("ignores a start while an Import is already running and keeps the running status", async () => {
    const { db } = openDb(":memory:");
    const job = createImportJob(db, fakeClient({ "2024-01": [chessComGame()] }));

    const first = job.start(range);
    const second = job.start({ ...range, to: { year: 2024, month: 12 } });

    expect(second).toEqual(first);
    await job.idle();
    expect(job.status().total).toBe(3); // the second range never took effect
  });

  it("ends the pass cleanly when the fetch fails unexpectedly, without taking the relay down", async () => {
    const { db } = openDb(":memory:");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({});
    client.fetchMonth = async () => {
      throw new Error("chess.com unreachable");
    };
    const job = createImportJob(db, client);

    job.start(range);
    await expect(job.idle()).resolves.toBeUndefined();

    expect(job.status().running).toBe(false);
  });
});
