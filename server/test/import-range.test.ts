import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { listGames } from "../src/repository";
import { importRange } from "../src/import";
import { importedGame, fakeClient, interceptMonths, seedProfile } from "./fixtures";
import type { ImportRangeParams } from "../src/import";

/** A fresh database with the one `Profile` these tests import under. */
function testDb() {
  const { db } = openDb(":memory:");
  return { db, profileId: seedProfile(db) };
}

const params = (profileId: number, over: Partial<ImportRangeParams> = {}): ImportRangeParams => ({
  profileId,
  username: "me",
  platform: "chesscom",
  from: { year: 2024, month: 1 },
  to: { year: 2024, month: 1 },
  categories: ["blitz"],
  ...over,
});

describe("importRange", () => {
  it("imports the month's Games when both bounds are the same month", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({ "2024-01": [importedGame()] });

    const result = await importRange(db, client, params(profileId));

    expect(result.imported).toBe(1);
    expect(listGames(db, profileId)).toHaveLength(1);
  });

  it("covers every month of the range in order and consolidates their figures", async () => {
    const { db, profileId } = testDb();
    const asked: string[] = [];
    const client = fakeClient({
      "2023-12": [importedGame({ timeControlCategory: "blitz" })],
      // 2024-01 left out on purpose: a month the Player was simply inactive in.
      "2024-02": [
        importedGame({ timeControlCategory: "rapid" }),
        importedGame({ timeControlCategory: "rapid", playerColor: "black", result: "loss" }),
      ],
    });
    const spying = interceptMonths(client, ({ year, month }) => {
      asked.push(`${year}-${String(month).padStart(2, "0")}`);
    });

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
    const client = fakeClient({ "2024-01": [importedGame()], "2024-02": [importedGame()] });
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
      "2024-01": [importedGame()],
      // 2024-02 left out: the Player simply did not play that month.
      "2024-03": [importedGame(), importedGame()],
    });

    const result = await importRange(db, client, {
      ...params(profileId),
      to: { year: 2024, month: 3 },
    });

    expect(result.months).toEqual([
      { month: { year: 2024, month: 1 }, imported: 1, alreadyPresent: 0 },
      { month: { year: 2024, month: 2 }, imported: 0, alreadyPresent: 0 },
      { month: { year: 2024, month: 3 }, imported: 2, alreadyPresent: 0 },
    ]);
  });

  it("carries on past a month chess.com cannot answer for, and says so on that month's line", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({
      "2024-01": [importedGame()],
      "2024-02": new Error("chess.com request failed (429)"),
      "2024-03": [importedGame()],
    });

    const result = await importRange(db, client, {
      ...params(profileId),
      to: { year: 2024, month: 3 },
    });

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
      "2024-01": [importedGame()],
      "2024-02": new Error("unreachable"),
      "2024-03": [importedGame()],
    });

    const result = await importRange(db, client, {
      ...params(profileId),
      to: { year: 2024, month: 3 },
    });

    expect(result.imported).toBe(2);
    expect(result.totalFetched).toBe(2);
    expect(result.message).toBeUndefined(); // a partly successful Import is not a failed one
  });

  it("catches up only the missing month when the range is replayed", async () => {
    const { db, profileId } = testDb();
    const failing = fakeClient({
      "2024-01": [importedGame({ gameUrl: "https://chess.com/g/jan" })],
      "2024-02": new Error("unreachable"),
    });
    const recovered = fakeClient({
      "2024-01": [importedGame({ gameUrl: "https://chess.com/g/jan" })],
      "2024-02": [importedGame({ gameUrl: "https://chess.com/g/feb" })],
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
    // Every month answered, all of them empty: "nothing found" is then a
    // statement the run actually established, and it is said once for the range.
    const { db, profileId } = testDb();
    const client = fakeClient({});

    const result = await importRange(db, client, {
      ...params(profileId),
      to: { year: 2024, month: 3 },
    });

    expect(result.message).toBe(
      "Aucune partie trouvée de 2024-01 à 2024-03 dans les cadences sélectionnées.",
    );
  });

  it("never says nothing was found when a month was never answered", async () => {
    // The claim is about what the range HELD; a month the Platform refused was
    // not read, so nothing about its contents was established. The one wrong
    // conclusion available to the Player here is "I did not play in those
    // months" — which is exactly what the per-month lines exist to prevent.
    const { db, profileId } = testDb();
    const refused = new Error("Lichess request failed (500)");
    const client = fakeClient({ "2024-01": refused, "2024-02": refused, "2024-03": refused });

    const result = await importRange(db, client, {
      ...params(profileId),
      to: { year: 2024, month: 3 },
    });

    expect(result.message ?? "").not.toMatch(/aucune partie trouv/i);
    // What it says instead: what failed, that nothing already held is lost, and
    // the range to retry — the shape the interruption message established.
    expect(result.message).toMatch(/2024-01/);
    expect(result.message).toMatch(/2024-03/);
    expect(result.message).toMatch(/conserv/i);
  });

  it("still says nothing was found when only SOME months failed and the answered ones were empty", async () => {
    // The mixed case, and the reason the rule is "every month answered" rather
    // than "nothing imported": February was read and was genuinely empty, but
    // January was not read at all, so the range as a whole cannot be called
    // empty. The retry range starts at the first month that failed.
    const { db, profileId } = testDb();
    const client = fakeClient({ "2024-01": new Error("Lichess request failed (500)") });

    const result = await importRange(db, client, {
      ...params(profileId),
      to: { year: 2024, month: 3 },
    });

    expect(result.message ?? "").not.toMatch(/aucune partie trouv/i);
    expect(result.message).toMatch(/2024-01/);
  });

  it("says nothing when at least one month of the range brought Games in", async () => {
    const { db, profileId } = testDb();
    const client = fakeClient({ "2024-03": [importedGame()] });

    const result = await importRange(db, client, {
      ...params(profileId),
      to: { year: 2024, month: 3 },
    });

    expect(result.message).toBeUndefined();
  });
});

describe("an Import whose stream broke mid-flight", () => {
  /** A range whose stream dies in March, after two months came through. */
  const brokenInMarch = () =>
    fakeClient({
      "2024-01": [importedGame({ gameUrl: "https://x/1" })],
      "2024-02": [importedGame({ gameUrl: "https://x/2" })],
      "2024-03": { games: [importedGame({ gameUrl: "https://x/3" })], cutShortWith: new Error("le flux a été interrompu avant la fin") },
    });

  it("says where it stopped, that the Games are kept, and the exact range left to run", async () => {
    // Three facts, none decorative. Without the second the Player assumes the
    // whole import has to be redone; without the third they have to work the
    // range out themselves, from a list of month lines.
    const { db, profileId } = testDb();

    const result = await importRange(
      db,
      brokenInMarch(),
      params(profileId, { from: { year: 2024, month: 1 }, to: { year: 2024, month: 5 } }),
    );

    // The last month that came through IN FULL — not the month it broke in.
    expect(result.message).toContain("2024-02");
    expect(result.message).toMatch(/conserv/i);
    // The range to retype, starting AT the month it broke in, never after it:
    // March is partial, and re-fetching it is free while declaring it covered
    // would be a silent, permanent hole.
    expect(result.message).toMatch(/2024-03/);
    expect(result.message).toMatch(/2024-05/);
  });

  it("counts what arrived in the cut month as fetched, so the summary cannot keep more than it received", async () => {
    // The headline read "4 games fetched — 5 imported": more kept than
    // received, which is impossible on its face. The month the stream died in
    // never gets a `month-done`, by design (we over-declare incompleteness), so
    // its Games were counted as imported and never as fetched.
    const { db, profileId } = testDb();

    const result = await importRange(
      db,
      brokenInMarch(),
      params(profileId, { from: { year: 2024, month: 1 }, to: { year: 2024, month: 5 } }),
    );

    expect(result.imported).toBe(3);
    expect(result.totalFetched).toBe(3);
    // The invariant, stated rather than the arithmetic: the Platform cannot have
    // given us less than we kept.
    expect(result.totalFetched).toBeGreaterThanOrEqual(result.imported);
  });

  it("returns its summary rather than throwing — a failed month has never aborted an Import", async () => {
    const { db, profileId } = testDb();

    const result = await importRange(
      db,
      brokenInMarch(),
      params(profileId, { from: { year: 2024, month: 1 }, to: { year: 2024, month: 5 } }),
    );

    expect(result.imported).toBe(3);
    // What arrived before the break is persisted and findable — that is what
    // makes re-running the stated range an addition rather than a redo.
    expect(listGames(db, profileId)).toHaveLength(3);
  });

  it("reports the month it broke in, and every month after it, as failed", async () => {
    const { db, profileId } = testDb();

    const result = await importRange(
      db,
      brokenInMarch(),
      params(profileId, { from: { year: 2024, month: 1 }, to: { year: 2024, month: 5 } }),
    );

    const failed = result.months.filter((m) => m.failure !== undefined);
    expect(failed.map((m) => m.month.month)).toEqual([3, 4, 5]);
    // And the covered ones stay covered, at their real counts.
    expect(result.months.filter((m) => m.failure === undefined).map((m) => m.month.month)).toEqual([
      1, 2,
    ]);
  });

  it("says nothing of the sort on a nominal import", async () => {
    // The message must be the sign of an interruption, not decoration that
    // always shows: a Player who sees it on a clean run learns to ignore it.
    const { db, profileId } = testDb();

    const result = await importRange(
      db,
      fakeClient({ "2024-01": [importedGame()] }),
      params(profileId),
    );

    expect(result.message ?? "").not.toMatch(/interromp/i);
  });
});
