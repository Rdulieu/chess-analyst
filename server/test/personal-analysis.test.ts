import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { games, personalAnalyses, personalMarks, type NewGame } from "../src/db/schema";
import { DECLARED_SEVERITIES } from "../src/personal/severity";
import { seedProfile, MORPHY_GAME } from "./fixtures";
import { getPersonalAnalysis, writeMark } from "../src/personal/repository";

function tempDb() {
  return openDb(":memory:").db;
}

let urlSeq = 0;
function seedGame(db: ReturnType<typeof tempDb>, over: Partial<NewGame> = {}) {
  return db
    .insert(games)
    .values({
      ...MORPHY_GAME,
      profileId: over.profileId ?? seedProfile(db),
      gameUrl: `https://chess.com/g/personal/${urlSeq++}`,
      ...over,
    })
    .returning()
    .get();
}

describe("Personal analysis store", () => {
  it("keeps a Declared severity the Player posed on a Move, and reads it back on that ply", () => {
    const db = tempDb();
    const game = seedGame(db);

    writeMark(db, game.id, 5, { declaredSeverity: "blunder" });

    const analysis = getPersonalAnalysis(db, game.id);
    expect(analysis?.marks).toEqual([
      { ply: 5, declaredSeverity: "blunder", note: null, keyMoment: false, posterior: false },
    ]);
  });

  it("answers an EMPTY reading for a Game nobody has read yet — the normal starting state, not an error", () => {
    const db = tempDb();
    const game = seedGame(db);

    expect(getPersonalAnalysis(db, game.id)).toEqual({
      gameId: game.id,
      sealedAt: null,
      engineSeenBeforeSeal: null,
      marks: [],
    });
  });

  it("leaves every other ply SILENT — a Move nobody examined has no row, never a sentinel", () => {
    const db = tempDb();
    const game = seedGame(db);

    writeMark(db, game.id, 5, { declaredSeverity: "sound" });

    // The whole point: what US-16b will read as coverage is the rows that exist,
    // so an unexamined Move must leave nothing behind at all.
    expect(db.select().from(personalMarks).all()).toHaveLength(1);
    expect(getPersonalAnalysis(db, game.id)?.marks.map((m) => m.ply)).toEqual([5]);
  });

  it("takes all five values, the opponent's Moves included, and lets the Player change their mind", () => {
    const db = tempDb();
    const game = seedGame(db);

    // ply 4 is an opponent Move in this Game (the Player is White): nothing in
    // the model distinguishes the side.
    for (const severity of DECLARED_SEVERITIES) writeMark(db, game.id, 4, { declaredSeverity: severity });

    const marks = getPersonalAnalysis(db, game.id)?.marks;
    expect(marks).toHaveLength(1);
    expect(marks?.[0].declaredSeverity).toBe("good");
  });

  it("holds ONE reading per Game, however many plies are marked", () => {
    const db = tempDb();
    const game = seedGame(db);

    writeMark(db, game.id, 1, { declaredSeverity: "mistake" });
    writeMark(db, game.id, 2, { declaredSeverity: "sound" });

    expect(db.select().from(personalAnalyses).all()).toHaveLength(1);
    expect(getPersonalAnalysis(db, game.id)?.marks.map((m) => m.ply)).toEqual([1, 2]);
  });

  it("files the reading under the Game's OWN Profile, so two players' readings never merge", () => {
    const db = tempDb();
    const mine = seedProfile(db, "DudulSmash");
    const theirs = seedProfile(db, "AFriend");
    const myGame = seedGame(db, { profileId: mine });
    const theirGame = seedGame(db, { profileId: theirs });

    writeMark(db, myGame.id, 1, { declaredSeverity: "blunder" });
    writeMark(db, theirGame.id, 1, { declaredSeverity: "good" });

    const rows = db.select().from(personalAnalyses).all();
    expect(rows.map((r) => [r.gameId, r.profileId]).sort()).toEqual(
      [[myGame.id, mine], [theirGame.id, theirs]].sort(),
    );
    expect(getPersonalAnalysis(db, myGame.id)?.marks[0].declaredSeverity).toBe("blunder");
    expect(getPersonalAnalysis(db, theirGame.id)?.marks[0].declaredSeverity).toBe("good");
  });

  it("answers nothing at all for a Game that does not exist — absent is not the same as unread", () => {
    const db = tempDb();
    expect(getPersonalAnalysis(db, 4242)).toBeUndefined();
  });
});
