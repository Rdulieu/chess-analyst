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
      // Ply, then layer: what was sealed reads before what was added on top of
      // it, which is the order the reading actually happened in.
      .sort((a, b) => a.ply - b.ply || Number(a.posterior) - Number(b.posterior)),
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
  // **The layer the write lands in follows from the seal, never from the
  // caller.** Once a reading is sealed, every write is posterior to the reveal —
  // there is no request that can put a mark back into the sealed layer, which is
  // what makes "sealed" mean anything at all.
  const posterior = analysis.sealedAt !== null;
  const where = and(
    eq(personalMarks.analysisId, analysis.id),
    eq(personalMarks.ply, ply),
    eq(personalMarks.posterior, posterior),
  );
  const existing = db.select().from(personalMarks).where(where).get();
  // What a post-seal edit starts from: the sealed mark, when this layer holds
  // nothing yet. Changing one field of a sealed mark must carry the others over,
  // not silently blank them — the Player is amending a reading, not writing a
  // fresh one. Read-only: the sealed row itself is never touched.
  const sealedBelow = posterior
    ? db
        .select()
        .from(personalMarks)
        .where(
          and(
            eq(personalMarks.analysisId, analysis.id),
            eq(personalMarks.ply, ply),
            eq(personalMarks.posterior, false),
          ),
        )
        .get()
    : undefined;
  const base = existing ?? sealedBelow;

  // A field the caller **named** is what the caller says, `null` included — a
  // field it did not name is left as it was. `??` would conflate the two and make
  // erasing a Note impossible: the fallback would keep restoring the old text.
  const next: Pick<PersonalMark, "declaredSeverity" | "note" | "keyMoment"> = {
    declaredSeverity: said(patch, "declaredSeverity")
      ? (patch.declaredSeverity ?? null)
      : (base?.declaredSeverity ?? null),
    // A blank Note is not a Note (CONTEXT.md): the Player said nothing, and
    // storing whitespace would make a ply *claim* to have been examined.
    note: blankToNull(said(patch, "note") ? patch.note : base?.note),
    // Never null: a `Key moment` is posed or it is not, and "unknown" is not one
    // of its states.
    keyMoment: said(patch, "keyMoment")
      ? patch.keyMoment === true
      : (base?.keyMoment ?? false),
  };

  // Nothing left said about this ply, so no row: **silence is not a value**, and
  // a row of nulls would be a mark asserting the Move was examined and found to
  // be nothing at all. Taking back the last mark returns the ply to silence.
  if (isSilent(next)) {
    if (existing) db.delete(personalMarks).where(where).run();
  } else if (existing) {
    db.update(personalMarks).set(next).where(where).run();
  } else {
    db.insert(personalMarks).values({ analysisId: analysis.id, ply, posterior, ...next }).run();
  }

  return getPersonalAnalysis(db, gameId);
}

/**
 * Why a seal was refused. A business fact with a name, not a thrown string: both
 * refusals are things the Player must be *told*, and an exception carrying prose
 * would have every caller re-deciding how to phrase them.
 *
 * - `empty` — there is nothing to confront. Sealing here would open a comparison
 *   against no reading at all.
 * - `already-sealed` — the reading is what it was. Re-sealing would move the date
 *   and could rewrite the provenance, which is the whole thing the seal fixes.
 */
export class SealRefusal {
  constructor(readonly reason: "empty" | "already-sealed" | "no-such-game") {}
}

/**
 * **Seals** a reading: *this is my reading, now show me the engine* (CONTEXT.md).
 * It does two things and only two — it **fixes what will be confronted** and it
 * **dates** the reading — plus records the one thing that makes a later
 * comparison honest: whether the engine's findings **had already been shown for
 * this Game**.
 *
 * `engineSeen` comes from the client, because only the client knows what was
 * actually rendered. This is the **one** fact in the app where what was displayed
 * becomes persistent, and the exception is deliberate: a comparison with no
 * provenance is not a comparison. It is a **label, not a lock** — a cleared local
 * store falls back to "not seen", and another tab is always a click away, so what
 * is stored is what the app can honestly claim to have observed and nothing more.
 *
 * **Irreversible**: there is no unsealing function here, and that absence is the
 * feature. If what is confronted could be reopened, it would no longer be what the
 * Player had written.
 */
export function sealAnalysis(
  db: Db,
  gameId: number,
  { engineSeen }: { engineSeen: boolean },
): PersonalAnalysis | SealRefusal {
  const game = db.select().from(games).where(eq(games.id, gameId)).get();
  if (!game) return new SealRefusal("no-such-game");

  const analysis = db
    .select()
    .from(personalAnalyses)
    .where(eq(personalAnalyses.gameId, gameId))
    .get();
  // No reading at all and a reading with no marks are the same emptiness here:
  // in both cases there is nothing that could be confronted.
  if (!analysis) return new SealRefusal("empty");
  if (analysis.sealedAt !== null) return new SealRefusal("already-sealed");
  const marks = db
    .select()
    .from(personalMarks)
    .where(eq(personalMarks.analysisId, analysis.id))
    .all();
  if (marks.length === 0) return new SealRefusal("empty");

  db.update(personalAnalyses)
    .set({ sealedAt: new Date().toISOString(), engineSeenBeforeSeal: engineSeen })
    .where(eq(personalAnalyses.id, analysis.id))
    .run();

  return getPersonalAnalysis(db, gameId)!;
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
