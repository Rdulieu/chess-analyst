import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { games } from "../src/db/schema";
import { listGames, getGame } from "../src/repository";
import { seedProfile } from "./fixtures";

function tempDb() {
  return openDb(":memory:");
}

describe("game repository", () => {
  it("reads back a stored Game with all of the Game glossary fields", () => {
    const { db } = tempDb();
    db.insert(games)
      .values({
        profileId: seedProfile(db),
        gameUrl: "https://www.chess.com/game/live/1",
        pgn: "1. e4 e5",
        opponent: "Alice",
        playerColor: "white",
        result: "win",
        date: "2026-01-15",
        timeControlCategory: "blitz",
      })
      .run();

    const all = listGames(db);

    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      gameUrl: "https://www.chess.com/game/live/1",
      pgn: "1. e4 e5",
      opponent: "Alice",
      playerColor: "white",
      result: "win",
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
        profileId: seedProfile(db),
        gameUrl: "https://www.chess.com/game/live/2",
        pgn: "1. d4 d5",
        opponent: "Bob",
        playerColor: "black",
        result: "loss",
        date: "2026-02-01",
        timeControlCategory: "rapid",
      })
      .returning()
      .get();

    expect(getGame(db, inserted.id)).toMatchObject({ opponent: "Bob", playerColor: "black" });
    expect(getGame(db, 9999)).toBeUndefined();
  });

  it("rejects a second Game with the same chess.com URL under the same Profile", () => {
    const { db } = tempDb();
    const value = {
      profileId: seedProfile(db),
      gameUrl: "https://www.chess.com/game/live/3",
      pgn: "1. c4",
      opponent: "Carol",
      playerColor: "white" as const,
      result: "draw" as const,
      date: "2026-03-01",
      timeControlCategory: "bullet" as const,
    };
    db.insert(games).values(value).run();

    expect(() => db.insert(games).values(value).run()).toThrow();
  });
});
