import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { games } from "../src/db/schema";
import { listGames, getGame } from "../src/repository";

function tempDb() {
  return openDb(":memory:");
}

describe("game repository", () => {
  it("reads back a stored Game with all of the Game glossary fields", () => {
    const { db } = tempDb();
    db.insert(games)
      .values({
        pgn: "1. e4 e5",
        opponent: "Alice",
        result: "1-0",
        date: "2026-01-15",
        timeControlCategory: "blitz",
      })
      .run();

    const all = listGames(db);

    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      pgn: "1. e4 e5",
      opponent: "Alice",
      result: "1-0",
      date: "2026-01-15",
      timeControlCategory: "blitz",
    });
    expect(typeof all[0].id).toBe("number");
  });

  it("getGame returns the Game by id, or undefined when it does not exist", () => {
    const { db } = tempDb();
    const inserted = db
      .insert(games)
      .values({
        pgn: "1. d4 d5",
        opponent: "Bob",
        result: "0-1",
        date: "2026-02-01",
        timeControlCategory: "rapid",
      })
      .returning()
      .get();

    expect(getGame(db, inserted.id)).toMatchObject({ opponent: "Bob" });
    expect(getGame(db, 9999)).toBeUndefined();
  });
});
