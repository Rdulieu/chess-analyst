import { describe, it, expect, vi, afterEach } from "vitest";
import { openDb } from "../src/db";
import { listGames } from "../src/repository";
import { createImportJob } from "../src/import";
import { importedGame, fakeClient, seedProfile } from "./fixtures";
import type { ImportRangeParams } from "../src/import";

/** A fresh database with the one `Profile` these tests import under. */
function testDb() {
  const { db } = openDb(":memory:");
  return { db, profileId: seedProfile(db) };
}

afterEach(() => vi.restoreAllMocks());

const rangeFor = (profileId: number): ImportRangeParams => ({
  profileId,
  username: "me",
  platform: "chesscom",
  from: { year: 2024, month: 1 },
  to: { year: 2024, month: 3 },
  categories: ["blitz"],
});

describe("createImportJob", () => {
  it("fills the summary as it goes: a month's line is there before the pass ends", async () => {
    const { db, profileId } = testDb();
    let release!: () => void;
    const secondMonth = new Promise<void>((r) => (release = r));
    const client = fakeClient({ "2024-01": [importedGame()], "2024-02": [importedGame()] });
    const slow = {
      ...client,
      fetchMonth: async (u: string, y: number, m: number) => {
        if (m === 2) await secondMonth;
        return client.fetchMonth(u, y, m);
      },
    };
    const job = createImportJob(db, { chesscom: slow });

    job.start({ ...rangeFor(profileId), to: { year: 2024, month: 2 } });
    // Wait for January to land while February is still held.
    while (job.status().done < 1) await new Promise((r) => setTimeout(r, 5));

    const midway = job.status();
    expect(midway.running).toBe(true);
    expect(midway.result?.months).toHaveLength(1);
    expect(midway.result?.months[0]).toMatchObject({
      month: { year: 2024, month: 1 },
      imported: 1,
    });

    release();
    await job.idle();
    expect(job.status().result?.months).toHaveLength(2);
  });

  it("reports the rangeFor(profileId)'s months as the total and returns before the pass has run", async () => {
    const { db, profileId } = testDb();
    const job = createImportJob(db, { chesscom: fakeClient({ "2024-01": [importedGame()] }) });

    const started = job.start(rangeFor(profileId));

    // The summary starts empty and fills in month by month, rather than
    // appearing all at once at the end.
    expect(started).toMatchObject({ running: true, total: 3, done: 0 });
    expect(started.result).toMatchObject({ imported: 0, months: [] });
    expect(listGames(db, profileId)).toHaveLength(0); // not awaited: nothing imported yet
    await job.idle();
  });

  it("advances to done === total and carries the consolidated summary once finished", async () => {
    const { db, profileId } = testDb();
    const job = createImportJob(db, {
      chesscom: fakeClient({ "2024-01": [importedGame()], "2024-03": [importedGame()] }),
    });

    job.start(rangeFor(profileId));
    await job.idle();

    const status = job.status();
    expect(status.running).toBe(false);
    expect(status.done).toBe(3);
    expect(status.total).toBe(3);
    expect(status.result).toMatchObject({ imported: 2, alreadyPresent: 0 });
    expect(listGames(db, profileId)).toHaveLength(2);
  });

  it("ignores a start while an Import is already running and keeps the running status", async () => {
    const { db, profileId } = testDb();
    const job = createImportJob(db, { chesscom: fakeClient({ "2024-01": [importedGame()] }) });

    const first = job.start(rangeFor(profileId));
    const second = job.start({ ...rangeFor(profileId), to: { year: 2024, month: 12 } });

    expect(second).toEqual(first);
    await job.idle();
    expect(job.status().total).toBe(3); // the second rangeFor(profileId) never took effect
  });

  it("ends the pass cleanly when the fetch fails unexpectedly, without taking the relay down", async () => {
    const { db, profileId } = testDb();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({});
    client.fetchMonth = async () => {
      throw new Error("chess.com unreachable");
    };
    const job = createImportJob(db, { chesscom: client });

    job.start(rangeFor(profileId));
    await expect(job.idle()).resolves.toBeUndefined();

    expect(job.status().running).toBe(false);
  });
});
