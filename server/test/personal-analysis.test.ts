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

  it("keeps a Note on any ply, the opponent's Moves and the starting Position included", () => {
    const db = tempDb();
    const game = seedGame(db);

    writeMark(db, game.id, 0, { note: "Ouverture que je joue mal en général." });
    writeMark(db, game.id, 4, { note: "Là il me laisse le centre." });

    expect(getPersonalAnalysis(db, game.id)?.marks).toEqual([
      { ply: 0, declaredSeverity: null, note: "Ouverture que je joue mal en général.", keyMoment: false, posterior: false },
      { ply: 4, declaredSeverity: null, note: "Là il me laisse le centre.", keyMoment: false, posterior: false },
    ]);
  });

  it("keeps a Note's text exactly as written, line breaks included", () => {
    const db = tempDb();
    const game = seedGame(db);

    writeMark(db, game.id, 3, { note: "Deux idées :\n- pousser d4\n- ou attendre" });

    expect(getPersonalAnalysis(db, game.id)?.marks[0].note).toBe(
      "Deux idées :\n- pousser d4\n- ou attendre",
    );
  });

  it("holds a Note and a verdict on the same ply, each independent of the other", () => {
    const db = tempDb();
    const game = seedGame(db);

    writeMark(db, game.id, 3, { declaredSeverity: "mistake" });
    writeMark(db, game.id, 3, { note: "j'avais vu Bxh7 mais pas la suite" });

    expect(getPersonalAnalysis(db, game.id)?.marks).toEqual([
      {
        ply: 3,
        declaredSeverity: "mistake",
        note: "j'avais vu Bxh7 mais pas la suite",
        keyMoment: false,
        posterior: false,
      },
    ]);
  });

  it("erases a Note without touching the verdict beside it, and the other way round", () => {
    const db = tempDb();
    const game = seedGame(db);
    writeMark(db, game.id, 3, { declaredSeverity: "blunder", note: "je ne comprends pas ce coup" });

    writeMark(db, game.id, 3, { note: null });
    expect(getPersonalAnalysis(db, game.id)?.marks[0]).toMatchObject({
      declaredSeverity: "blunder",
      note: null,
    });

    writeMark(db, game.id, 3, { note: "finalement je crois que c'est jouable" });
    writeMark(db, game.id, 3, { declaredSeverity: null });
    expect(getPersonalAnalysis(db, game.id)?.marks[0]).toMatchObject({
      declaredSeverity: null,
      note: "finalement je crois que c'est jouable",
    });
  });

  it("does not store a blank Note as a Note — and lets the ply fall silent again", () => {
    const db = tempDb();
    const game = seedGame(db);

    writeMark(db, game.id, 3, { note: "   \n  " });

    // Nothing was said, so nothing is stored: a whitespace Note would be a mark
    // claiming the ply was examined.
    expect(getPersonalAnalysis(db, game.id)?.marks).toEqual([]);
    expect(db.select().from(personalMarks).all()).toEqual([]);
  });

  it("drops the row when the last thing said about a ply is taken back", () => {
    const db = tempDb();
    const game = seedGame(db);
    writeMark(db, game.id, 3, { note: "à revoir" });

    writeMark(db, game.id, 3, { note: null });

    // The ply is silent again, and silence has no row — not a row of nulls
    // standing for a Move that was examined and found to be nothing.
    expect(db.select().from(personalMarks).all()).toEqual([]);
    expect(getPersonalAnalysis(db, game.id)?.marks).toEqual([]);
  });

  it("trims the surrounding blanks but keeps the words and the breaks inside", () => {
    const db = tempDb();
    const game = seedGame(db);

    writeMark(db, game.id, 3, { note: "  première ligne\n\nseconde  " });

    expect(getPersonalAnalysis(db, game.id)?.marks[0].note).toBe("première ligne\n\nseconde");
  });

  it("marks a Move as where the Game turned, and unmarks it", () => {
    const db = tempDb();
    const game = seedGame(db);

    writeMark(db, game.id, 21, { keyMoment: true });
    expect(getPersonalAnalysis(db, game.id)?.marks).toEqual([
      { ply: 21, declaredSeverity: null, note: null, keyMoment: true, posterior: false },
    ]);

    writeMark(db, game.id, 21, { keyMoment: false });
    // Unmarked and nothing else said there, so the ply is silent again — no row.
    expect(getPersonalAnalysis(db, game.id)?.marks).toEqual([]);
  });

  it("holds SEVERAL Key moments, with no order and none of them the one", () => {
    const db = tempDb();
    const game = seedGame(db);

    // A Game can turn twice; the Player is not asked to pick.
    for (const ply of [9, 21, 4]) writeMark(db, game.id, ply, { keyMoment: true });

    const marks = getPersonalAnalysis(db, game.id)?.marks ?? [];
    expect(marks.map((m) => m.ply)).toEqual([4, 9, 21]);
    // Nothing in a mark ranks it: there is no rank to store, so none can leak.
    expect(marks.every((m) => m.keyMoment)).toBe(true);
    expect(Object.keys(marks[0]).sort()).toEqual(
      ["declaredSeverity", "keyMoment", "note", "ply", "posterior"].sort(),
    );
  });

  it("imposes no ceiling on how many Key moments a reading may hold", () => {
    const db = tempDb();
    const game = seedGame(db);

    for (let ply = 1; ply <= 30; ply++) writeMark(db, game.id, ply, { keyMoment: true });

    // Marking twelve Moves out of thirty is not forbidden; it is visible, which
    // is what the displayed count is for.
    expect(getPersonalAnalysis(db, game.id)?.marks.filter((m) => m.keyMoment)).toHaveLength(30);
  });

  it("keeps a Key moment, a verdict and a Note on one ply, each independent of the others", () => {
    const db = tempDb();
    const game = seedGame(db);

    writeMark(db, game.id, 21, { keyMoment: true });
    writeMark(db, game.id, 21, { declaredSeverity: "mistake" });
    writeMark(db, game.id, 21, { note: "c'est ici que je perds le fil" });
    expect(getPersonalAnalysis(db, game.id)?.marks[0]).toEqual({
      ply: 21,
      declaredSeverity: "mistake",
      note: "c'est ici que je perds le fil",
      keyMoment: true,
      posterior: false,
    });

    // Taking one back leaves the other two exactly as they were: a pivot is not
    // a verdict, and neither is a reason.
    writeMark(db, game.id, 21, { keyMoment: false });
    expect(getPersonalAnalysis(db, game.id)?.marks[0]).toMatchObject({
      keyMoment: false,
      declaredSeverity: "mistake",
      note: "c'est ici que je perds le fil",
    });
  });
});
