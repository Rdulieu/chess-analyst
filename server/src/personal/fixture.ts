import { and, eq } from "drizzle-orm";
import type { Db } from "../db";
import { games, evaluations, personalAnalyses, personalMarks } from "../db/schema";
import type { DeclaredSeverity } from "./severity";
import { gamePositions } from "../chess/positions";
import { fixtureBestLine } from "../engine/fixture";

/**
 * The seeded `Confrontation` fixture (US-26): **one analysed Game with a sealed
 * reading on it**, cut to carry the cases the engine does not produce on
 * command.
 *
 * Every Feature Path of this story runs on it, and every scenario using it must
 * say the same thing: **the fixture proves the screen renders these cases, not
 * that the engine produces them.** The `Evaluation`s here are *fabricated* —
 * chosen so that a forced Move measures a `Blunder`, so that both degree gaps
 * exist, so that a marker lands beside the damage. A real `Analysis pass` would
 * give none of that on demand. The real witness stays Game 715 of the live
 * database, opened by hand in the HP pass.
 *
 * Mirrors `seedDangerFixture` in shape (stored `Evaluation`s, no engine — ADR-0009)
 * with one deliberate difference: **this one is re-runnable**. The Danger seed
 * inserts afresh on every call and piles up duplicates; that was tolerable while
 * the local database was throwaway and is not any more (ADR-0015).
 */

/**
 * Where each case sits, **by ply** — exported so the tests and the Feature Paths
 * name a case rather than a magic number, and so renumbering the Game breaks
 * one table instead of fifteen scattered literals.
 */
export const CONFRONTATION_FIXTURE_CASES = {
  /**
   * The case that settles the whole denominator: the only legal Move, measured
   * a `Blunder`, declared `Sound` — and the Player is **right**. A naive matrix
   * would count it wrong; the `Counted Move` denominator is why it does not.
   */
  forcedBlunderDeclaredSound: 11,
  /** A Move played once the Position was already decided, carrying a verdict. */
  decidedWithVerdict: 13,
  /** `Mistake` declared where a `Blunder` was measured — read milder than it was. */
  underRead: 17,
  /** `Blunder` declared where a `Mistake` was measured — dramatised, not hallucinated. */
  overRead: 15,
  /** A band declared where the engine flagged nothing at all. */
  falseAlarm: 5,
  /** A `Good`: shown, counted as having looked, and never scored. */
  good: 19,
  /** A verdict on one of the **opponent's** Moves — kept, shown, never scored. */
  opponentVerdict: 12,
  /** A counted Move the Player said nothing about. Silence is not a verdict. */
  silence: 3,
  /** A verdict the engine confirms — so the screen has a `Bonne lecture` to show. */
  agreement: 7,
  /** A Move carrying a written note, to be read back beside the verdict. */
  note: 23,
  /**
   * A `Key moment` landing on a real, costly fault.
   *
   * **The same ply as `agreement`, and deliberately so**: a Move the Player
   * both judged rightly and marked as pivotal is the combination worth
   * rendering — the screen shows its two cartouches side by side there. The
   * cost is that retuning ply 7 moves both cases at once, which is why they are
   * named apart here even though they point at one number.
   */
  keyMomentFound: 7,
  /** A `Key moment` landing on nothing, with a fault left to name the distance to. */
  keyMomentAside: 21,
  /** A costly fault **no** marker points at — the damage the coverage figure misses. */
  keyMomentMissed: 9,
  /** A marker on a Move the analysis does not count. */
  markerOnUncounted: 13,
  /** A marker on one of the opponent's Moves. */
  markerOnOpponent: 14,
  /** A flagged `Inaccuracy` the Player called `Sound` — a lesser miss. */
  inaccuracyMissed: 25,
} as const;



/**
 * The Game's half-moves. Exported so a test can assert the seed writes one
 * `Evaluation` per Position (`plies + 1`, the starting Position included)
 * rather than counting rows against a literal that drifts.
 */
export const CONFRONTATION_FIXTURE_PLIES = 35;

/**
 * The Game itself. The Player is **White**, and the line is not decorative:
 * `5... Bxf2+` leaves White exactly one legal Move (`6. Kxf2`), which is what
 * makes the forced case reachable at all. Found by search rather than by hand —
 * a forced Position is not something one writes from memory.
 */
const FIXTURE_PGN =
  "1. g3 e6 2. a4 d5 3. h4 Nf6 4. Na3 Bc5 5. Nb5 Bxf2+ 6. Kxf2 Nh5 7. Kg2 Qg5 " +
  "8. d3 Nf6 9. Nh3 Kd7 10. Kg1 Qxc1 11. Kf2 g6 12. e3 Rg8 13. Ke1 c5 " +
  "14. Nf2 Ne4 15. Ng4 Ke7 16. a5 Kf8 17. Ra2 Nd6 18. Nc3";

/**
 * The Game's identity in the database. The seed is keyed on it — `games` is
 * unique on `(profileId, gameUrl)` — which is what makes re-running the seed
 * refresh one row instead of adding a second Game.
 */
const FIXTURE_GAME_URL = "fixture://confrontation/us-26";

/**
 * The fabricated `Evaluation`s, **White-relative centipawns, indexed by ply**
 * (0 = the starting Position).
 *
 * White-relative because that is the only way to read them: a Move's severity
 * is the drop between the Position before it and the Position after, and both
 * have to be on the same side's scale to be subtracted. The stored column is
 * *side-to-move* relative (CONTEXT.md), so odd plies are negated on the way in
 * — once, here, rather than in the reader's head.
 *
 * The values are chosen against the published bands (`classifyMove`: 30 / 20 /
 * 5) and the `Counted Move` floor (`DECIDED_FLOOR` = 10), never guessed:
 *
 * | ply | drop  | measured   | declared      | the case |
 * |-----|-------|------------|---------------|----------|
 * |   1 |  0.00 | —          | `Sound`       | agreement on "nothing flagged" |
 * |   3 |  0.00 | —          | *(nothing)*   | silence |
 * |   5 |  1.84 | —          | `Mistake`     | false alarm |
 * |   7 | 11.83 | inaccuracy | `Inaccuracy`  | agreement, and a marker that finds it |
 * |   9 | 38.58 | blunder    | `Sound`       | a Blunder missed, and unmarked |
 * |  11 | 30.38 | blunder    | `Sound`       | **forced** — and the Player is right |
 * |  13 |  0.00 | —          | `Blunder`     | already **decided**, and marked |
 * |  15 | 24.88 | mistake    | `Blunder`     | over-read by one degree |
 * |  17 | 31.35 | blunder    | `Mistake`     | under-read by one degree |
 * |  19 |  1.79 | —          | `Good`        | nothing to compare it against |
 * |  21 |  0.90 | —          | *(nothing)*   | a marker beside the damage |
 * |  23 |  0.45 | —          | `Sound` + note | a note to read back |
 * |  25 | 10.09 | inaccuracy | `Sound`       | an Inaccuracy missed |
 *
 * The swings on the opponent's plies are large and deliberately so — they are
 * what brings White back above the decided floor after the dive, and nothing
 * scores the opponent, so no figure depends on their plausibility.
 */
const WHITE_RELATIVE_CP: number[] = [
  0, 0, 0, 0, 0, -20, 20, -110, 150, -300, 50, -310, -700, -700, -100, -450, 0, -400, 100, 80,
  80, 70, 70, 65, 65, -45, -45, -45, -45, -45, -45, -45, -45, -45, -45, -45,
];

/** One ply of the sealed reading. Absent plies were left untouched by the Player. */
interface FixtureMark {
  ply: number;
  declaredSeverity?: DeclaredSeverity;
  note?: string;
  keyMoment?: boolean;
}

/**
 * The sealed reading itself — written as a Player writes one: a verdict here, a
 * marker there, a note where something was worth saying, and **silence
 * everywhere else**. Silence is a case too, and the most common one.
 */
const FIXTURE_MARKS: FixtureMark[] = [
  { ply: 1, declaredSeverity: "sound" },
  { ply: 5, declaredSeverity: "mistake", note: "je n'aime pas affaiblir la case f3 si tôt." },
  { ply: 7, declaredSeverity: "inaccuracy", keyMoment: true },
  { ply: 9, declaredSeverity: "sound" },
  { ply: 11, declaredSeverity: "sound", note: "je reprends, il n'y a rien d'autre à jouer." },
  { ply: 12, declaredSeverity: "mistake" },
  { ply: 13, declaredSeverity: "blunder", keyMoment: true },
  { ply: 14, keyMoment: true },
  { ply: 15, declaredSeverity: "blunder" },
  { ply: 17, declaredSeverity: "mistake" },
  { ply: 19, declaredSeverity: "good" },
  { ply: 21, keyMoment: true },
  {
    ply: 23,
    declaredSeverity: "sound",
    note: "je consolide avant d'ouvrir le centre — c'est le plan que j'avais en tête depuis e3.",
  },
  { ply: 25, declaredSeverity: "sound" },
];

/**
 * How many plies the sealed reading writes on — **derived from the reading
 * itself**, never a hand-kept literal.
 *
 * A literal here would be updated in the same edit that removed a mark, and the
 * re-runnability test would go on passing over a fixture that had lost a case.
 * Derived, it can only ever say what the seed actually writes, which is the one
 * thing that test is asking. Guarding the *cases* is the other assertions' job,
 * one per ply — and that split is deliberate: this constant proves nothing
 * doubled, they prove nothing vanished.
 */
export const CONFRONTATION_FIXTURE_MARKS = FIXTURE_MARKS.length;

/** When the reading was sealed. Fixed, so two seedings say the same date. */
const SEALED_AT = "2026-09-10T09:00:00.000Z";

/**
 * Seeds the fixture under `profileId` and answers the Game's id.
 *
 * **Re-runnable, and destructive of nothing but its own rows.** Re-seeding
 * rewrites the fixture's `Evaluation`s and its reading, leaving every other
 * Game, reading and `Analysis pass` in the database untouched — which matters
 * here in a way it did not use to: import rebuilds Games cheaply, and **nothing
 * rebuilds an `Evaluation`** (ADR-0015).
 *
 * Refreshing rather than returning early is deliberate: a seed that skipped when
 * the row existed would leave an out-of-date fixture in place after this file
 * changed, and every Feature Path would then exercise yesterday's cases while
 * reading today's table of plies.
 */
export function seedConfrontationFixture(db: Db, profileId: number): number {
  const gameId = upsertGame(db, profileId);

  // The fixture's own rows only, and by `gameId` — never a blanket delete.
  db.delete(evaluations).where(eq(evaluations.gameId, gameId)).run();
  db.delete(personalAnalyses).where(eq(personalAnalyses.gameId, gameId)).run();

  // The fixture stands in for an `Analysis pass`, so it stores what a pass
  // stores: the FEN it queried on (ADR-0012) and a `Best line` (ADR-0016).
  const fens = gamePositions(FIXTURE_PGN);
  db.insert(evaluations)
    .values(
      WHITE_RELATIVE_CP.map((whiteCp, ply) => ({
        gameId,
        ply,
        fen: fens[ply],
        // Stored side-to-move relative (CONTEXT.md): on the opponent's plies the
        // sign flips. Converted once, here, so no reader has to remember.
        cp: ply % 2 === 0 ? whiteCp : -whiteCp,
        mate: null,
        pv: fixtureBestLine(fens[ply]).join(" "),
      })),
    )
    .run();

  const { id: analysisId } = db
    .insert(personalAnalyses)
    .values({
      gameId,
      profileId,
      createdAt: SEALED_AT,
      sealedAt: SEALED_AT,
      // Read unaided, said so explicitly: a comparison with no provenance is not
      // a comparison, and a fixture that left it to the fallback would be
      // testing the fallback.
      engineSeenBeforeSeal: false,
    })
    .returning({ id: personalAnalyses.id })
    .get();

  db.insert(personalMarks)
    .values(
      FIXTURE_MARKS.map((mark) => ({
        analysisId,
        ply: mark.ply,
        declaredSeverity: mark.declaredSeverity ?? null,
        note: mark.note ?? null,
        keyMoment: mark.keyMoment ?? false,
        // Every mark is in the **sealed** layer: a posterior mark is out of the
        // confrontation by definition, so seeding one would seed nothing.
        posterior: false,
      })),
    )
    .run();

  return gameId;
}

/**
 * The fixture's Game row, created or refreshed in place. Keyed on
 * `(profileId, gameUrl)`, which the schema already holds unique — so this is
 * the database's own notion of "the same Game", not a second one invented here.
 */
function upsertGame(db: Db, profileId: number): number {
  const row = {
    profileId,
    gameUrl: FIXTURE_GAME_URL,
    pgn: FIXTURE_PGN,
    opponent: "fixture-opponent",
    playerColor: "white" as const,
    result: "loss" as const,
    date: "2026-09-10",
    timeControlCategory: "blitz" as const,
    analyzed: true,
  };

  // Scoped to the Profile as well as the URL, because that pair is what the
  // schema holds unique: keying on the URL alone would make one Profile's seed
  // overwrite another's.
  const existing = db
    .select({ id: games.id })
    .from(games)
    .where(and(eq(games.profileId, profileId), eq(games.gameUrl, FIXTURE_GAME_URL)))
    .get();

  if (existing) {
    db.update(games).set(row).where(eq(games.id, existing.id)).run();
    return existing.id;
  }
  return db.insert(games).values(row).returning({ id: games.id }).get().id;
}
