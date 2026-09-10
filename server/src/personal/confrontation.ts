import type { UncountedReason } from "../analysis/counted";
import type { MoveAnnotation } from "../analysis/derivation";
import type { MoveSeverity } from "../danger/move-quality";
import type { SearchRegime } from "../engine/types";
import type { GameAnnotations } from "../annotations/repository";
import type { PersonalAnalysis } from "./repository";
import { DECLARED_SEVERITIES, isDeclaredSeverity, type DeclaredSeverity } from "./severity";

/**
 * What one Game's `Confrontation` (CONTEXT.md) holds about the Player's
 * `Declared severity`s against the measured ones.
 *
 * **Numerators and denominators travel undivided.** The share is computed where
 * it is read, never stored, so the aggregate can be a **sum of numerators over a
 * sum of denominators** rather than an average of rates — which would give a
 * reading of three Moves the same weight as one of sixty.
 */
export interface SeverityReading {
  /**
   * The Player's `Counted Move`s — the denominator **both** figures share. Not
   * the Game's half-moves and not the Player's Moves: how justly the Player
   * judges is a conclusion about where they go wrong, and a `Counted Move` is
   * already the denominator of every such conclusion.
   */
  countedMoves: number;
  /**
   * Those of them the Player put a **verdict** on. A `Note` is not a verdict —
   * the Player said something, they judged nothing — and **silence stays
   * silence**: a Move with no `Declared severity` means *not examined*, which is
   * itself worth knowing.
   */
  examined: number;
  /**
   * Among the examined, those the engine has something to say about. **`Good` is
   * not one of them**: the engine flags flawed Moves only and has no band for
   * merit, so there is nothing to set it against. It is kept — the Player needs
   * it to read their Game — shown, and counted apart; it simply cannot be right
   * or wrong.
   *
   * Hence the two figures do not share this denominator: coverage asks *did I
   * look*, accuracy asks *was I right*, and a `Good` answers the first and not
   * the second.
   */
  scorable: number;
  /** Among the scorable, how many the engine agrees with. */
  agreed: number;
  /**
   * The **confusion matrix**: what the Player declared, against what was
   * measured. Rows are the five declared bands, columns the three measured ones
   * **plus `none`** — "the engine flagged nothing", which is a fact rather than
   * an absence, and the column that makes `Sound` scorable at all.
   *
   * It says *how* the Player is wrong and not merely how often, and it carries
   * one further fact for free: **the direction of the bias**. The matrix is not
   * symmetric, and over-reading danger and under-reading it are opposite faults
   * of analysis that none of the three figures separates alone.
   *
   * The `good` row is filled and **never scored** — kept so the Player can see
   * what they said, excluded from the accuracy denominator. Summing every cell
   * outside that row gives `scorable` exactly, so the Player can add up what
   * they see and land on the figure printed beside it.
   */
  matrix: ConfusionMatrix;
  /**
   * Verdicts the Player posed that **nothing scores**, kept apart **by reason**.
   * Melting them into one "not scored" would leave the Player unable to audit
   * any of them, and each says something different:
   *
   * - `good` — the engine flags flawed Moves only and has **no band for merit**,
   *   so there is nothing to set it against. It still counts as having looked.
   * - `opponent` — kept and shown, never scored, and **by decision** rather than
   *   for want of the means: the `Evaluation`s are there, but this tool is about
   *   the Player's own improvement.
   */
  unscored: UnscoredVerdicts;
}

/**
 * How the Player's reading of one Move compares with what was measured
 * (CONTEXT.md — `Bonne lecture` / `Sous-lecture` / `Sur-lecture`).
 *
 * Follows `agrees()` **without modifying it**: equality on the band, `Sound`
 * against "nothing flagged" being an agreement. A gap is read by its direction
 * — milder than measured is a `Sous-lecture`, harder is a `Sur-lecture` — and
 * there is **no tolerance window**: one band apart is a divergence, so the
 * accuracy figure already shipped does not move a hair.
 */
export type ReadingTerm = "bonne-lecture" | "sous-lecture" | "sur-lecture";

/**
 * Why nothing scores a Move — **never melted into one "not scored"**. Each says
 * something different, and a Player who cannot tell them apart can audit none
 * of them. A mute grey would erase the case that settles the whole denominator:
 * a forced Move measured a `Blunder` where the Player said `Sound` and is right.
 */
export type UnscoredCase = "good" | "opponent" | "forced" | "decided" | "silence";

/**
 * What the Player's `Key moment`s were worth on **one Move** — the second
 * reading of a `Confrontation`, *did I look in the right place*, said at the
 * Move instead of as a rate with no Moves behind it.
 *
 * Six cases and a silence. Five of them are re-readings of what the derivation
 * already held; **`missed` is new**. "Your markers found 30% of the damage" had
 * no Move to show for the other 70%: the derivation carried the markers that
 * found nothing, never the losses no marker points at. They come from the very
 * same data — the counted, costly faults, minus those carrying a marker.
 */
export type KeyMomentCase =
  /** Marked, and the Move cost chances. The marker earned its place. */
  | "found"
  /** Marked, cost nothing, and a fault exists elsewhere — the distance is shown. */
  | "aside"
  /** Marked, cost nothing, and the Game holds no fault at all to have found. */
  | "no-target"
  /** Marked, but the opponent played it. */
  | "on-opponent"
  /** Marked, but the analysis does not count this Move. */
  | "on-uncounted"
  /** **Not** marked, and the Move cost chances. The damage nobody pointed at. */
  | "missed";

/** The `Key moment` reading of one Move, or nothing where there is nothing to say. */
export interface MoveKeyMoment {
  case: KeyMomentCase;
  /** What this Move cost the Player. `0` on every case but `found` and `missed`. */
  lost: number;
  /**
   * For `aside`: the Player's costly Move nearest the marker, so the sentence
   * can name **where they should have looked** rather than merely saying the
   * marker was wrong. `null` when there was no fault to point at.
   */
  nearest: { ply: number; notation: string | null; lost: number } | null;
}

/**
 * What the Player's reading was worth on **one Move** (ADR-0032).
 *
 * The derivation used to increment four counters and throw the pair away, which
 * is why a Player reading "1 sur 4" could not find the other three. It keeps
 * them now, and the four figures become a **fold over this list** — one
 * derivation read at two altitudes rather than two that agree by luck.
 *
 * `term` and `unscored` are **mutually exclusive and jointly exhaustive**:
 * exactly one is non-null. A Move is scored, or it is excused for a stated
 * reason; it is never both and never neither.
 */
export interface MoveReading {
  ply: number;
  /** Standard notation, so an entry names its Move rather than numbering it. */
  notation: string | null;
  /** `null` where the Player said nothing — silence, not a verdict. */
  declared: DeclaredSeverity | null;
  /** The engine's band, or `none` — a **fact**, not an absence. */
  measured: MeasuredLabel;
  /** Set exactly when the Move is scored. */
  term: ReadingTerm | null;
  /** Set exactly when it is not. */
  unscored: UnscoredCase | null;
  /**
   * What the Player's `Key moment`s were worth here. `null` where there is
   * **neither a marker nor a loss** — and that silence is deliberate: sixty
   * cartouches saying "nothing" would bury the six that say something.
   */
  keyMoment: MoveKeyMoment | null;
}

/** Verdicts shown and never scored, by the reason nothing scores them. */
export interface UnscoredVerdicts {
  good: number;
  opponent: number;
}

/** What the engine said about a Move: one of its three bands, or nothing at all. */
export type MeasuredLabel = MoveSeverity | "none";

/** Declared band -> measured label -> how many Moves. */
export type ConfusionMatrix = Record<DeclaredSeverity, Record<MeasuredLabel, number>>;

/** The four columns, worst to "nothing flagged". */
export const MEASURED_LABELS: MeasuredLabel[] = ["blunder", "mistake", "inaccuracy", "none"];

/** An empty matrix — every cell present, so a zero is a zero and not a hole. */
function emptyMatrix(): ConfusionMatrix {
  return Object.fromEntries(
    DECLARED_SEVERITIES.map((declared) => [
      declared,
      Object.fromEntries(MEASURED_LABELS.map((label) => [label, 0])) as Record<
        MeasuredLabel,
        number
      >,
    ]),
  ) as ConfusionMatrix;
}

/**
 * How the reading was written: with the engine's findings **already shown** for
 * this Game, or not. A **provenance, not a lock** — the app cannot make anyone
 * blind, and claiming otherwise would sell a guarantee it cannot keep.
 */
export type Provenance = "unaided" | "informed";

/**
 * One Game's `Confrontation`, as every read path hands it over — and as the
 * aggregate folds it (ADR-0017). It carries **everything the aggregate
 * consumes**, so a Player can open one Game and see how a global figure was
 * arrived at.
 */
export interface GameConfrontation {
  gameId: number;
  /** When the reading was fixed. A Confrontation only exists past this instant. */
  sealedAt: string;
  /** Never optional: a comparison with no provenance is not a comparison. */
  provenance: Provenance;
  /** The `Search regime` behind the engine's figures — one per Game. */
  regime: SearchRegime | null;
  severity: SeverityReading;
  /**
   * **The reading of every Move**, from ply 1 (ply 0 is nobody's Move) —
   * the Player's own and the opponent's alike (ADR-0032).
   *
   * The opponent's are here on purpose: the screen indexes by the ply it is
   * standing on, and a list with holes would make every reader write the same
   * lookup guard — then go silent on a Move the Player is looking at, instead
   * of saying why their verdict is not scored there.
   *
   * `severity`'s four figures are the **sum** of this list. The corpus fold
   * (`foldConfrontations`) does not consume it: a corpus has nothing to do with
   * one Game's Moves, so the summary's contract is untouched.
   */
  moves: MoveReading[];
  /**
   * The Player's Moves the analysis **does not count**, each with **its own
   * reason** — never melted into one "not counted". A Game where the Player
   * played four `Blunder`s can legitimately contribute **zero** counted errors,
   * and a screen that leaves that gap unreadable destroys the Player's trust
   * exactly where the divergence is the thing needing explanation (ADR-0017).
   *
   * The verdict the Player put there travels with it, because it is the case
   * that settles the whole denominator: a **forced** catastrophic Move measures
   * a `Blunder` and is nobody's mistake, so a Player calling it `Sound` is
   * **right** — and the screen can only say so if the verdict is still here.
   *
   * Recognising that a Position was already decided, or that a Move had no
   * alternative, is itself a thing to learn in analysis.
   */
  /**
   * The `Key moment` reading (CONTEXT.md): **what share of the damage** the
   * Player's markers found. Undivided, like everything else here.
   */
  keyMoments: KeyMomentReading;
  uncounted: UncountedMove[];
  /**
   * What the Player wrote **after the seal**: kept, shown as such, and part of no
   * figure. Seeing the engine and understanding why is the most fertile moment of
   * the exercise — forbidding it would be absurd, and counting it dishonest.
   */
  posterior: PosteriorMark[];
}

/**
 * The second of the `Confrontation`'s readings: not *did the Player judge well*
 * but **did they look in the right place**.
 *
 * One division, in the currency everything else here already uses — no new
 * scale, no new threshold, and **no tolerance window**: a marker one Move from
 * the loss earns no approximate credit, the **distance is shown** instead. That
 * says more than silent partial credit, and it keeps the score additive and free
 * of any magic constant, the clarity of the calculation to the Player being a
 * requirement of its own here.
 */
export interface KeyMomentReading {
  /** How many `Key moment`s the sealed reading holds. They are not ranked. */
  marked: number;
  /**
   * The chances lost by the flagged counted Moves those markers point at. A Move
   * counts **once**, so adding markers cannot inflate this beyond what they
   * genuinely name — which is why several `Key moment`s need no special rule.
   */
  damageFound: number;
  /**
   * The chances lost by **all** the Player's flagged counted Moves — the Game's
   * own `flaggedLoss`, read rather than recomputed. Confronted against the
   * Player's own faults and never against the Game's biggest swing, which may
   * well be the *opponent*'s blunder: faulting the Player for missing a gift
   * teaches nothing.
   *
   * `0` means **no score** — not a zero. A zero would make a sound reading look
   * like a failed one, so the division is refused where there was nothing to find.
   */
  damageTotal: number;
  /**
   * The `Drift`, **beside the score and out of the division**. Out, because
   * Drift has **no Move to point at**: counting it would put 100% beyond the
   * reach of a perfect reading. Beside, because that is where it teaches most —
   * a Game lost by bleeding had no fault to find, and saying so is the lesson.
   */
  drift: number;
  /** Markers that found nothing, with the distance to what they missed. */
  misses: KeyMomentMiss[];
}

/**
 * A `Key moment` that cost the Player nothing to point at, and **how far off it
 * was**. Shown rather than credited: "your marker is on 21.Rd1, which cost
 * nothing — the loss is on 22.Nxe5, one Move later" says more than a silent
 * partial credit, and leaves the calculation additive.
 */
export interface KeyMomentMiss {
  ply: number;
  /**
   * The Move in standard notation, so the sentence **names** it rather than
   * merely numbering it. `null` when the notations were not to hand — a Move
   * number is a poorer sentence than a name, and still a true one.
   */
  notation: string | null;
  /** What the marked Move actually cost. Often `0`, and that is the point. */
  lostThere: number;
  /** The Player's flawed Move nearest to it, or `null` when they had none. */
  nearest: { ply: number; lost: number; notation: string | null } | null;
}

/** One of the Player's Moves the analysis excludes, and what they said about it. */
export interface UncountedMove {
  ply: number;
  /** Standard notation, so the entry **names** its Move rather than numbering it. */
  notation: string | null;
  reason: UncountedReason;
  /** `null` when the Player said nothing here — silence, not a verdict. */
  declared: DeclaredSeverity | null;
}

/** One mark written after the reveal. Shown as a layer, never compared. */
export interface PosteriorMark {
  ply: number;
  /** Standard notation — the same discipline as everywhere else on this screen. */
  notation: string | null;
  declaredSeverity: DeclaredSeverity | null;
  note: string | null;
  keyMoment: boolean;
}

/**
 * Why there is no `Confrontation` to give. **Two reasons, named apart** — they
 * are different facts with different next steps: one asks the Player to seal
 * their reading, the other to run the analysis. A single refusal for both would
 * leave them unable to tell which road to take, and a bare 404 would say the
 * Game is not there when it is.
 *
 * Modelled on `SealRefusal`: a refusal here is a **business fact**, not a
 * transport failure.
 */
export class ConfrontationRefusal {
  constructor(readonly reason: "not-sealed" | "not-analyzed") {}
}

/**
 * The engine side of a `Confrontation`, exactly as the API serves it — narrowed
 * to the four fields the join actually reads.
 *
 * A `Confrontation` is a **join, not a second derivation** (ADR-0019), so it
 * asks for what it reads and nothing more. The narrowing is what keeps the whole
 * annotations payload free to grow — the time block of US-15b, and whatever
 * comes next — without every caller that builds an engine side by hand having to
 * carry fields the join never looks at.
 */
export type ConfrontableAnnotations = Pick<
  GameAnnotations,
  "analyzed" | "recap" | "plies" | "regime"
>;

/**
 * Sets a sealed `Personal analysis` against what the engine found on the same
 * Game — **a join**, not a second derivation (ADR-0019). Everything the engine
 * side contributes arrives in `annotations`, exactly as the API already serves
 * it, so there is no way for this to disagree with the Game's own page.
 */
export function confrontGame(
  analysis: PersonalAnalysis,
  /**
   * The engine side, exactly as the API serves it. Narrowed to the four fields
   * a `Confrontation` actually joins on: it is a join, not a second derivation
   * (ADR-0019), so what it does not read it does not ask for — and a caller
   * holding an engine verdict from anywhere else can still be confronted.
   */
  annotations: ConfrontableAnnotations,
  /**
   * The Game's half-moves in standard notation, indexed by ply. Optional because
   * **no figure depends on it**: it names the Moves a distance talks about, and
   * a distance is still true without a name.
   */
  notations: string[] = [],
): GameConfrontation | ConfrontationRefusal {
  // The Player's own act is checked first: sending someone to go and analyse a
  // Game whose reading they have not finished points them down the wrong road.
  const { sealedAt } = analysis;
  if (sealedAt === null) return new ConfrontationRefusal("not-sealed");
  if (!annotations.analyzed || annotations.recap === null) {
    return new ConfrontationRefusal("not-analyzed");
  }

  const verdicts = sealedVerdicts(analysis);
  const reading: SeverityReading = {
    countedMoves: annotations.recap.countedMoves,
    examined: 0,
    scorable: 0,
    agreed: 0,
    matrix: emptyMatrix(),
    unscored: { good: 0, opponent: 0 },
  };

  const uncounted: UncountedMove[] = [];
  /**
   * What the derivation now KEEPS (ADR-0032). Filled by the same single pass
   * that fills the counters above — nothing extra is walked.
   */
  const moves: MoveReading[] = [];
  // The sealed layer only, and a ply **once**: `Key moment`s are not ranked and
  // are not counted twice.
  const marks = analysis.marks.filter((mark) => !mark.posterior);
  const marked = new Set(marks.filter((mark) => mark.keyMoment).map((mark) => mark.ply));
  // The Player's own flawed, counted Moves — what a marker is confronted against.
  const faults = annotations.plies
    .filter((move) => move.severity !== null && move.counted?.counted)
    .map((move) => ({ ply: move.ply, lost: move.chancesLost ?? 0 }));
  const lostAt = new Map(faults.map((fault) => [fault.ply, fault.lost]));

  for (const move of annotations.plies) {
    // Ply 0 is nobody's Move, so it has no reading to keep.
    if (move.ply === 0) continue;
    const declared = verdicts.get(move.ply) ?? null;
    const measured: MeasuredLabel = move.severity ?? "none";
    /** One entry, whatever this Move turns out to be. Completed below. */
    const entry: MoveReading = {
      ply: move.ply,
      notation: notations[move.ply] ?? null,
      declared,
      measured,
      term: null,
      unscored: null,
      keyMoment: keyMomentOf(move, marked, lostAt, faults, notations),
    };
    moves.push(entry);

    // `counted` is `null` for the **opponent's** Moves: nothing is derived for
    // them, so they are not "not counted" — they are not the Player's play at
    // all. Said at their own Move rather than left blank, because the Player
    // standing on one needs to know why their verdict is not scored there.
    if (move.counted === null) {
      entry.unscored = "opponent";
      // Counted HERE, in the one pass, rather than in a pre-pass of its own as
      // it used to be — the pre-pass existed only because the main loop walked
      // the Player's counted Moves alone. It walks every ply now, so a second
      // traversal would be a second derivation of a figure this list already
      // holds, which is the very thing ADR-0032 is against.
      if (declared !== null) reading.unscored.opponent += 1;
      continue;
    }
    if (!move.counted.counted) {
      // Kept apart BY REASON: the two say different things, and a Player who
      // cannot tell them apart can audit neither.
      if (move.counted.reason) {
        entry.unscored = move.counted.reason;
        uncounted.push({
          ply: move.ply,
          notation: entry.notation,
          reason: move.counted.reason,
          declared,
        });
      }
      continue;
    }
    if (declared === null) {
      // **Silence is not a verdict.** A Move nobody examined is neither right
      // nor wrong, and saying so is itself worth knowing.
      entry.unscored = "silence";
      continue;
    }
    reading.examined += 1;
    // Filled for every examined Move, `Good` included: the matrix shows what the
    // Player said. What it does NOT do is score the `good` row.
    reading.matrix[declared][measured] += 1;
    if (!isScorable(declared)) {
      entry.unscored = "good";
      reading.unscored.good += 1;
      continue;
    }
    reading.scorable += 1;
    entry.term = termFor(declared, measured);
    if (entry.term === "bonne-lecture") reading.agreed += 1;
  }

  return {
    gameId: analysis.gameId,
    sealedAt,
    // `false` and `null` both mean "nothing says the engine was shown". The
    // fallback is deliberately the honest one: guessing "informed" would
    // discredit the Player's own work, and guessing nothing is not an option
    // when the label is what makes the figure readable.
    provenance: analysis.engineSeenBeforeSeal ? "informed" : "unaided",
    regime: annotations.regime,
    severity: reading,
    moves,
    keyMoments: {
      marked: marked.size,
      damageFound: [...marked].reduce((sum, ply) => sum + (lostAt.get(ply) ?? 0), 0),
      damageTotal: annotations.recap.flaggedLoss,
      drift: annotations.recap.drift,
      misses: [...marked]
        .filter((ply) => !lostAt.get(ply))
        .sort((a, b) => a - b)
        .map((ply) => ({
          ply,
          notation: notations[ply] ?? null,
          lostThere: 0,
          // The same helper as the per-Move `aside` case: two derivations of
          // "the nearest loss" would agree only by luck, and this one carried
          // a real defect (it could name the marked Move itself).
          nearest: namedFault(ply, faults, notations),
        })),
    },
    uncounted,
    posterior: analysis.marks
      .filter((mark) => mark.posterior)
      .map(({ ply, declaredSeverity, note, keyMoment }) => ({
        ply,
        notation: notations[ply] ?? null,
        declaredSeverity,
        note,
        keyMoment,
      })),
  };
}

/**
 * The verdicts that are **confronted**: the sealed layer only. What the Player
 * writes after the reveal is kept and shown, never compared — seeing the engine
 * and understanding why is the most fertile moment of the exercise, so
 * forbidding it would be absurd and counting it would be dishonest.
 */
function sealedVerdicts(analysis: PersonalAnalysis): Map<number, DeclaredSeverity> {
  const verdicts = new Map<number, DeclaredSeverity>();
  for (const mark of analysis.marks) {
    if (mark.posterior) continue;
    if (mark.declaredSeverity === null) continue;
    // The column is typed, the database is not. A value from outside the five
    // would index a matrix row that does not exist and take down **the whole
    // summary** — one unreadable Game costing the Player every other one, which
    // is exactly what the fold's filter exists to prevent. Dropped here rather
    // than counted as a sixth band nothing can read.
    if (!isDeclaredSeverity(mark.declaredSeverity)) continue;
    verdicts.set(mark.ply, mark.declaredSeverity);
  }
  return verdicts;
}

/** Whether the engine has any band to set this verdict against. */
function isScorable(declared: DeclaredSeverity): boolean {
  return declared !== "good";
}

/**
 * The bands **ordered by how much danger they claim**, mildest first — the one
 * thing a boolean agreement could not say: *which way* the Player was wrong.
 *
 * `sound` sits on "nothing flagged" because that is exactly what it asserts:
 * *I looked, and I find nothing to fault*. That equivalence is what makes
 * `Sound` scorable at all, and it is the same one `agrees()` encoded — read as
 * a position on a scale rather than as a special case.
 *
 * `good` is absent: the engine has **no band for merit**, so a `Good` has
 * nothing to be above or below and is never given a term.
 */
const DANGER_ORDER: Record<Exclude<DeclaredSeverity, "good"> | MeasuredLabel, number> = {
  none: 0,
  sound: 0,
  inaccuracy: 1,
  mistake: 2,
  blunder: 3,
};

/**
 * What one scorable verdict was worth against what was measured.
 *
 * **This replaces `agrees()` without changing a single answer it gave.** Equal
 * rank is an agreement — the three shared bands by equality, and `Sound`
 * against "nothing flagged" by the equivalence above, which is the entire
 * reason a confrontation can expose the Player's *hits* and not only their
 * misses. What is new is only the **direction** of a disagreement, which the
 * boolean threw away: reading danger milder than it was and reading it harder
 * are opposite faults of analysis, and no rate separates them.
 *
 * **No tolerance window.** One band apart is a divergence, not a near-miss:
 * the accuracy figure already shipped does not move a hair, and a silent
 * partial credit would be exactly the magic constant this project refuses.
 */
function termFor(declared: DeclaredSeverity, measured: MeasuredLabel): ReadingTerm {
  const claimed = DANGER_ORDER[declared as Exclude<DeclaredSeverity, "good">];
  const actual = DANGER_ORDER[measured];
  if (claimed === actual) return "bonne-lecture";
  return claimed < actual ? "sous-lecture" : "sur-lecture";
}

/**
 * What the Player's `Key moment`s were worth on one Move.
 *
 * The order of the tests is the meaning. A marker on the opponent's Move or on
 * an uncounted one is named **for what it is** before anything is said about
 * distance: telling a Player their marker was "beside the damage" when it was
 * actually on a Move nothing scores would send them looking for a mistake they
 * did not make.
 *
 * `null` where there is neither a marker nor a loss — the great majority of a
 * Game. Sixty cartouches saying "nothing here" would bury the six that speak.
 */
function keyMomentOf(
  move: MoveAnnotation,
  marked: Set<number>,
  lostAt: Map<number, number>,
  faults: { ply: number; lost: number }[],
  notations: string[],
): MoveKeyMoment | null {
  const lost = lostAt.get(move.ply) ?? 0;
  const none = { lost: 0, nearest: null };

  if (!marked.has(move.ply)) {
    // **The case that was missing.** A costly fault nobody pointed at is the
    // other side of "your markers found 30% of the damage" — and until now it
    // had no Move to show. Nothing else here is new.
    return lost > 0 ? { case: "missed", lost, nearest: null } : null;
  }

  // Marked. Why it earned nothing matters more than that it earned nothing.
  if (move.counted === null) return { case: "on-opponent", ...none };
  if (!move.counted.counted) return { case: "on-uncounted", ...none };
  if (lost > 0) return { case: "found", lost, nearest: null };

  // Marked, counted, and it cost nothing. Either the Game had a fault to find
  // elsewhere — and the distance is what teaches — or it had none at all, and
  // saying so is fairer than implying the Player missed something.
  const nearest = namedFault(move.ply, faults, notations);
  if (nearest === null) return { case: "no-target", ...none };
  return { case: "aside", lost: 0, nearest };
}

/**
 * The Player's **costly** Move nearest a marker that found nothing, named.
 * Ties go to the **later** Move, because a marker placed just before the loss
 * is the common near miss and naming the Move that follows it is what teaches.
 *
 * Two exclusions, and both are corrections of a real defect rather than
 * defensive noise:
 *
 * - **The marked ply itself is excluded.** `faults` holds every flagged counted
 *   Move, and a flagged Move can cost `0` — `classifyMove` compares best play
 *   against what was played, while `chancesLostByMove` compares the two actual
 *   Positions, and `gameRecap` already skips `lost <= 0` for exactly this
 *   reason. A marked Move of that shape used to win its own distance-0
 *   comparison, and the sentence read "this Move cost nothing — the nearest
 *   loss is on **this same Move**".
 * - **Moves that cost nothing are excluded.** Pointing a Player at a "loss"
 *   worth zero teaches a contradiction, and the whole purpose of this sentence
 *   is to teach *where to have looked*.
 *
 * `null` when there was no costly Move to point at: nothing to find is a fact,
 * not a miss, and saying so is fairer than implying one.
 */
function namedFault(
  ply: number,
  faults: { ply: number; lost: number }[],
  notations: string[],
): { ply: number; lost: number; notation: string | null } | null {
  const costly = faults.filter((fault) => fault.lost > 0 && fault.ply !== ply);
  if (costly.length === 0) return null;

  const nearest = costly.reduce((best, fault) => {
    const d = Math.abs(fault.ply - ply);
    const bestD = Math.abs(best.ply - ply);
    if (d < bestD) return fault;
    if (d === bestD && fault.ply > best.ply) return fault;
    return best;
  });
  return { ...nearest, notation: notations[nearest.ply] ?? null };
}

/**
 * The Player's readings **folded across their whole history** — the figure US-16b
 * exists for. "Where I read well and where I read badly" is a claim about **tens**
 * of readings, never about one.
 *
 * No `misses`, no `uncounted`, no `posterior`: those are facts about **one** Game,
 * and a corpus has nothing to do with them.
 */
export interface ConfrontationSummary {
  /** How many sealed readings this rests on. Three readings are not a tendency. */
  readings: number;
  /**
   * How those readings were written — **counted, never used to cut the figures**.
   * A reader has to know what a comparison is worth; but two sets of three
   * figures on a sample this size would say less than these counts beside one set.
   */
  provenance: Record<Provenance, number>;
  severity: SeverityReading;
  /** The Key moment reading, without the per-Game `misses`. */
  keyMoments: Omit<KeyMomentReading, "misses">;
}

/**
 * **The aggregate IS the sum** (ADR-0017). Not a query of its own: two
 * implementations of a method agree only by luck and diverge in silence, and the
 * reader has no way to tell which is wrong. Reconciliation here is the
 * **definition**, not a test we hope goes green — which is what lets the Player
 * open one Game they know and see how a global figure was arrived at.
 *
 * **Numerators and denominators are summed separately**, never the rates
 * averaged: a reading of three Moves must not weigh as much as one of sixty.
 * The division still belongs where it is read, so an empty corpus yields empty
 * denominators and the screen says **no score** rather than printing `0 %`.
 */
export function foldConfrontations(games: GameConfrontation[]): ConfrontationSummary {
  const summary: ConfrontationSummary = {
    readings: games.length,
    provenance: { unaided: 0, informed: 0 },
    severity: {
      countedMoves: 0,
      examined: 0,
      scorable: 0,
      agreed: 0,
      matrix: emptyMatrix(),
      unscored: { good: 0, opponent: 0 },
    },
    keyMoments: { marked: 0, damageFound: 0, damageTotal: 0, drift: 0 },
  };

  for (const game of games) {
    summary.provenance[game.provenance] += 1;
    for (const field of ["countedMoves", "examined", "scorable", "agreed"] as const) {
      summary.severity[field] += game.severity[field];
    }
    summary.severity.unscored.good += game.severity.unscored.good;
    summary.severity.unscored.opponent += game.severity.unscored.opponent;
    // Folded whole, so the direction of the bias reads at the corpus scale from
    // the very same cells — one derivation, two altitudes.
    for (const declared of DECLARED_SEVERITIES) {
      for (const label of MEASURED_LABELS) {
        summary.severity.matrix[declared][label] += game.severity.matrix[declared][label];
      }
    }
    for (const field of ["marked", "damageFound", "damageTotal", "drift"] as const) {
      summary.keyMoments[field] += game.keyMoments[field];
    }
  }

  return summary;
}
