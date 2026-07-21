import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { getPlayerUsername, setPlayerUsername } from "../src/repository";

describe("player settings", () => {
  it("returns undefined when no username has been stored yet", () => {
    const { db } = openDb(":memory:");
    expect(getPlayerUsername(db)).toBeUndefined();
  });

  it("stores and reads back the Player's chess.com username", () => {
    const { db } = openDb(":memory:");

    setPlayerUsername(db, "magnus");
    expect(getPlayerUsername(db)).toBe("magnus");
  });

  it("overwrites the username on a second set (single stored value)", () => {
    const { db } = openDb(":memory:");

    setPlayerUsername(db, "magnus");
    setPlayerUsername(db, "hikaru");
    expect(getPlayerUsername(db)).toBe("hikaru");
  });
});
