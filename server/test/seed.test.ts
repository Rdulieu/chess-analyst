import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { seedFixtureIfEmpty } from "../src/seed";
import { listGames } from "../src/repository";

const TIME_CONTROL_CATEGORIES = ["bullet", "blitz", "rapid", "daily"];

describe("fixture seeding", () => {
  it("inserts one fixture Game, fully populated, when the table is empty", () => {
    const { db } = openDb(":memory:");

    seedFixtureIfEmpty(db);

    const all = listGames(db);
    expect(all).toHaveLength(1);
    const fixture = all[0];
    expect(fixture.pgn).toContain("e4");
    expect(fixture.opponent.length).toBeGreaterThan(0);
    expect(fixture.result).toBe("1-0");
    expect(fixture.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(TIME_CONTROL_CATEGORIES).toContain(fixture.timeControlCategory);
  });

  it("does not insert a second time when a Game already exists (idempotent)", () => {
    const { db } = openDb(":memory:");

    seedFixtureIfEmpty(db);
    seedFixtureIfEmpty(db);

    expect(listGames(db)).toHaveLength(1);
  });
});
