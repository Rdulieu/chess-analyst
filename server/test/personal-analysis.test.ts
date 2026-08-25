import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { games, personalAnalyses, personalMarks, type NewGame } from "../src/db/schema";
import { DECLARED_SEVERITIES } from "../src/personal/severity";
import { seedProfile, MORPHY_GAME } from "./fixtures";
import {
  getPersonalAnalysis,
  writeMark,
  sealAnalysis,
  SealRefusal,
} from "../src/personal/repository";
import * as repository from "../src/personal/repository";

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

describe("sealing a Personal analysis", () => {
  it("dates the reading and records that the engine had not been shown", () => {
    const db = tempDb();
    const game = seedGame(db);
    writeMark(db, game.id, 3, { declaredSeverity: "mistake" });

    const sealed = sealAnalysis(db, game.id, { engineSeen: false });

    expect(sealed).not.toBeInstanceOf(SealRefusal);
    const analysis = getPersonalAnalysis(db, game.id)!;
    expect(analysis.sealedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(analysis.engineSeenBeforeSeal).toBe(false);
  });

  it("records that the engine HAD been shown, when it had", () => {
    const db = tempDb();
    const game = seedGame(db);
    writeMark(db, game.id, 3, { declaredSeverity: "mistake" });

    sealAnalysis(db, game.id, { engineSeen: true });

    expect(getPersonalAnalysis(db, game.id)?.engineSeenBeforeSeal).toBe(true);
  });

  it("refuses to seal a reading with nothing in it, and says why", () => {
    const db = tempDb();
    const game = seedGame(db);

    const refusal = sealAnalysis(db, game.id, { engineSeen: false });

    // Sealing an empty reading would open a confrontation against nothing.
    expect(refusal).toBeInstanceOf(SealRefusal);
    expect((refusal as SealRefusal).reason).toBe("empty");
    expect(getPersonalAnalysis(db, game.id)?.sealedAt).toBeNull();
  });

  it("refuses to seal a reading that is already sealed, and says why", () => {
    const db = tempDb();
    const game = seedGame(db);
    writeMark(db, game.id, 3, { declaredSeverity: "mistake" });
    sealAnalysis(db, game.id, { engineSeen: false });
    const sealedAt = getPersonalAnalysis(db, game.id)?.sealedAt;

    const refusal = sealAnalysis(db, game.id, { engineSeen: true });

    expect(refusal).toBeInstanceOf(SealRefusal);
    expect((refusal as SealRefusal).reason).toBe("already-sealed");
    // Neither the instant nor the provenance is rewritten by a second attempt:
    // a sealed reading is what it was.
    expect(getPersonalAnalysis(db, game.id)?.sealedAt).toBe(sealedAt);
    expect(getPersonalAnalysis(db, game.id)?.engineSeenBeforeSeal).toBe(false);
  });

  it("exposes no way at all to unseal — the store has no such operation", () => {
    // Deliberately an assertion about the module's surface: if what is confronted
    // could be reopened, it would no longer be what the Player had written.
    const surface = Object.keys(repository).join(" ");
    expect(surface).not.toMatch(/unseal|reopen|desceller/i);
  });

  it("carries a mark written AFTER the seal to the posterior layer, leaving the initial one intact", () => {
    const db = tempDb();
    const game = seedGame(db);
    writeMark(db, game.id, 3, { declaredSeverity: "mistake", note: "je crois que c'est raté" });
    sealAnalysis(db, game.id, { engineSeen: false });

    writeMark(db, game.id, 3, { declaredSeverity: "blunder" });

    const marks = getPersonalAnalysis(db, game.id)!.marks;
    // Two layers on one ply: what was sealed, and what was understood afterwards.
    expect(marks).toEqual([
      {
        ply: 3,
        declaredSeverity: "mistake",
        note: "je crois que c'est raté",
        keyMoment: false,
        posterior: false,
      },
      {
        ply: 3,
        declaredSeverity: "blunder",
        note: "je crois que c'est raté",
        keyMoment: false,
        posterior: true,
      },
    ]);
  });

  it("puts a mark on a ply first touched after the seal in the posterior layer alone", () => {
    const db = tempDb();
    const game = seedGame(db);
    writeMark(db, game.id, 3, { declaredSeverity: "mistake" });
    sealAnalysis(db, game.id, { engineSeen: false });

    writeMark(db, game.id, 9, { note: "vu après coup : le clouage était là" });

    const marks = getPersonalAnalysis(db, game.id)!.marks;
    expect(marks.filter((m) => m.ply === 9)).toEqual([
      {
        ply: 9,
        declaredSeverity: null,
        note: "vu après coup : le clouage était là",
        keyMoment: false,
        posterior: true,
      },
    ]);
    // The sealed layer gained nothing: it is closed.
    expect(marks.filter((m) => !m.posterior).map((m) => m.ply)).toEqual([3]);
  });

  it("never lets a posterior write erase the sealed layer, however many times it happens", () => {
    const db = tempDb();
    const game = seedGame(db);
    writeMark(db, game.id, 3, { declaredSeverity: "sound" });
    sealAnalysis(db, game.id, { engineSeen: false });

    writeMark(db, game.id, 3, { declaredSeverity: "blunder" });
    writeMark(db, game.id, 3, { note: "en fait j'avais tort deux fois" });
    writeMark(db, game.id, 3, { keyMoment: true });
    // Even taking a posterior mark back must not touch what was sealed.
    writeMark(db, game.id, 3, { declaredSeverity: null, note: null, keyMoment: false });

    const initial = getPersonalAnalysis(db, game.id)!.marks.filter((m) => !m.posterior);
    expect(initial).toEqual([
      { ply: 3, declaredSeverity: "sound", note: null, keyMoment: false, posterior: false },
    ]);
  });
});
