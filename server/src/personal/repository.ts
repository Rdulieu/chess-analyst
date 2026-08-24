import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import { games, personalAnalyses, personalMarks } from "../db/schema";
import type { DeclaredSeverity } from "./severity";

/**
 * One **mark** of a `Personal analysis`, as every read path hands it over: the
 * ply it is on, and what the Player said there. Every judgement is nullable
 * because **silence is not a value** (CONTEXT.md) — `null` means *not examined*,
 * and no sentinel ever stands in for it.
 */
export interface PersonalMark {
  ply: number;
  declaredSeverity: DeclaredSeverity | null;
  note: string | null;
  keyMoment: boolean;
  /** Written after the seal: kept, shown as such, and out of the confrontation. */
  posterior: boolean;
}

/**
 * A `Personal analysis` (CONTEXT.md) as read back: the Game it reads, its marks,
 * and whether it has been sealed.
 */
export interface PersonalAnalysis {
  gameId: number;
  sealedAt: string | null;
  engineSeenBeforeSeal: boolean | null;
  marks: PersonalMark[];
}

/** What a caller may say about one ply. Omitted fields are left as they were. */
export type MarkPatch = Partial<Pick<PersonalMark, "declaredSeverity" | "note" | "keyMoment">>;

/**
 * The Player's reading of this Game — **an empty reading when there is none**,
 * never an error: no reading yet is the normal starting state of every Game, and
 * a caller that had to tell "absent" from "empty" would branch on it forever.
 * `undefined` is reserved for a Game that does not exist.
 */
export function getPersonalAnalysis(db: Db, gameId: number): PersonalAnalysis | undefined {
  const game = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game) return undefined;

  const analysis = db
    .select()
    .from(personalAnalyses)
    .where(eq(personalAnalyses.gameId, gameId))
    .get();
  if (!analysis) return { gameId, sealedAt: null, engineSeenBeforeSeal: null, marks: [] };

  const marks = db
    .select()
    .from(personalMarks)
    .where(eq(personalMarks.analysisId, analysis.id))
    .all();

  return {
    gameId,
    sealedAt: analysis.sealedAt,
    engineSeenBeforeSeal: analysis.engineSeenBeforeSeal,
    marks: marks
      .map(({ ply, declaredSeverity, note, keyMoment, posterior }) => ({
        ply,
        declaredSeverity,
        note,
        keyMoment,
        posterior,
      }))
      .sort((a, b) => a.ply - b.ply),
  };
}

/**
 * Records what the Player says about one ply, creating the reading on first
 * write — the Player starts a reading by writing in it, not by declaring one.
 * Answers the whole reading back, so a caller never has to re-read to know the
 * state it just produced.
 */
export function writeMark(
  db: Db,
  gameId: number,
  ply: number,
  patch: MarkPatch,
): PersonalAnalysis | undefined {
  const game = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game) return undefined;

  const analysis = ensureAnalysis(db, gameId, game.profileId);
  const where = and(eq(personalMarks.analysisId, analysis.id), eq(personalMarks.ply, ply));
  const existing = db.select().from(personalMarks).where(where).get();

  // A field the caller **named** is what the caller says, `null` included — a
  // field it did not name is left as it was. `??` would conflate the two and make
  // erasing a Note impossible: the fallback would keep restoring the old text.
  const next: Pick<PersonalMark, "declaredSeverity" | "note" | "keyMoment"> = {
    declaredSeverity: said(patch, "declaredSeverity")
      ? (patch.declaredSeverity ?? null)
      : (existing?.declaredSeverity ?? null),
    // A blank Note is not a Note (CONTEXT.md): the Player said nothing, and
    // storing whitespace would make a ply *claim* to have been examined.
    note: blankToNull(said(patch, "note") ? patch.note : existing?.note),
    // Never null: a `Key moment` is posed or it is not, and "unknown" is not one
    // of its states.
    keyMoment: said(patch, "keyMoment")
      ? patch.keyMoment === true
      : (existing?.keyMoment ?? false),
  };

  // Nothing left said about this ply, so no row: **silence is not a value**, and
  // a row of nulls would be a mark asserting the Move was examined and found to
  // be nothing at all. Taking back the last mark returns the ply to silence.
  if (isSilent(next)) {
    if (existing) db.delete(personalMarks).where(where).run();
  } else if (existing) {
    db.update(personalMarks).set(next).where(where).run();
  } else {
    db.insert(personalMarks).values({ analysisId: analysis.id, ply, ...next }).run();
  }

  return getPersonalAnalysis(db, gameId);
}

/**
 * Whether the patch **named** this field at all. The distinction the whole write
 * path turns on: a field named as `null` is the Player taking something back, a
 * field left out is a field they said nothing about this time.
 */
function said(patch: MarkPatch, key: keyof MarkPatch): boolean {
  return key in patch;
}

/**
 * A `Note` that is only whitespace is no Note at all. The surrounding blanks go;
 * the ones **inside** stay, because the line breaks the Player typed are part of
 * what they wrote.
 */
function blankToNull(note: string | null | undefined): string | null {
  if (typeof note !== "string") return null;
  const trimmed = note.trim();
  return trimmed === "" ? null : trimmed;
}

/** Whether a ply now has nothing said about it — hence no row to keep. */
function isSilent(mark: {
  declaredSeverity: unknown;
  note: unknown;
  keyMoment: unknown;
}): boolean {
  return mark.declaredSeverity === null && mark.note === null && mark.keyMoment !== true;
}

/**
 * The reading of this Game, created if this is the first mark written in it. The
 * `Profile` is the **Game's own** (ADR-0014): a reading is filed where the Game
 * it reads is filed, so it can never end up under another player's history.
 */
function ensureAnalysis(db: Db, gameId: number, profileId: number) {
  const existing = db
    .select()
    .from(personalAnalyses)
    .where(eq(personalAnalyses.gameId, gameId))
    .get();
  if (existing) return existing;
  return db
    .insert(personalAnalyses)
    .values({ gameId, profileId, createdAt: new Date().toISOString() })
    .returning()
    .get();
}
