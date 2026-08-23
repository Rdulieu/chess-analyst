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
    const profileId = seedProfile(db);
    db.insert(games)
      .values({
        profileId,
        gameUrl: "https://www.chess.com/game/live/1",
        pgn: "1. e4 e5",
        opponent: "Alice",
        playerColor: "white",
        result: "win",
        date: "2026-01-15",
        timeControlCategory: "blitz",
      })
      .run();

    const all = listGames(db, profileId);

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

  it("lists a Profile's Games most recent first", () => {
    const { db } = tempDb();
    const profileId = seedProfile(db);
    // Inserted in no particular order, so passing cannot be an accident of
    // insertion order: the middle date is stored last.
    for (const date of ["2026-01-15", "2026-03-20", "2026-02-10"]) {
      db.insert(games)
        .values({
          profileId,
          gameUrl: `https://www.chess.com/game/live/d-${date}`,
          pgn: "1. e4 e5",
          opponent: "Alice",
          playerColor: "white",
          result: "win",
          date,
          timeControlCategory: "blitz",
        })
        .run();
    }

    expect(listGames(db, profileId).map((g) => g.date)).toEqual([
      "2026-03-20",
      "2026-02-10",
      "2026-01-15",
    ]);
  });

  it("orders Games played the same day by the most recently retained", () => {
    const { db } = tempDb();
    const profileId = seedProfile(db);
    // The `date` column is a day with no clock, so several Games a day is a real
    // tie. The order they were retained in is the only chronological signal
    // left, so the last one imported reads first.
    const ids = ["a", "b", "c"].map(
      (tag) =>
        db
          .insert(games)
          .values({
            profileId,
            gameUrl: `https://www.chess.com/game/live/tie-${tag}`,
            pgn: "1. e4 e5",
            opponent: tag,
            playerColor: "white",
            result: "win",
            date: "2026-04-01",
            timeControlCategory: "blitz",
          })
          .returning()
          .get().id,
    );

    expect(listGames(db, profileId).map((g) => g.id)).toEqual([...ids].reverse());
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
