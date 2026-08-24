import { sqliteTable, integer, text, primaryKey, unique } from "drizzle-orm/sqlite-core";
import type { Platform, TimeControlCategory } from "../platform";
import type { DeclaredSeverity } from "../personal/severity";

/**
 * The `Profile` (CONTEXT.md, ADR-0014): **one account on one platform**, the
 * pair (`platform`, `username`) — and the unit by which every view is
 * partitioned. `platform` carries `chesscom` or `lichess` — a widening of the
 * type alone, no stored value changes, so nothing is owed a migration (US-12).
 * `username` holds the **canonical casing the platform itself answers**,
 * which is what stops `RDulieu` and `rdulieu` from becoming two Profiles
 * splitting one history in half — the pair being unique enforces the rest.
 */
export const profiles = sqliteTable(
  "profiles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    platform: text("platform").notNull().$type<Platform>(),
    username: text("username").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [unique().on(t.platform, t.username)],
);

export type Profile = typeof profiles.$inferSelect;

/**
 * The `games` table models the `Game` glossary term (see CONTEXT.md): an
 * imported chess.com match, recorded from the Player's point of view. It carries
 * the chess.com game URL (the immutable dedup key for incremental Import), the
 * side the Player played, the Player-relative result, the opponent, the date and
 * the time control category. No Evaluation/Mistake storage yet — that arrives
 * with US-4.
 */
export const games = sqliteTable(
  "games",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    // The `Profile` this Game belongs to (ADR-0014). Uniqueness is
    // `(profile_id, game_url)`, not the URL alone: the same match followed under
    // two Profiles is **two rows**, each recorded from its own Player's point of
    // view — by design, not a dedup bug.
    profileId: integer("profile_id")
      .notNull()
      .references(() => profiles.id),
    gameUrl: text("game_url").notNull(),
    pgn: text("pgn").notNull(),
    opponent: text("opponent").notNull(),
    playerColor: text("player_color").notNull().$type<"white" | "black">(),
    result: text("result").notNull().$type<"win" | "loss" | "draw">(),
    date: text("date").notNull(),
    timeControlCategory: text("time_control_category").notNull().$type<TimeControlCategory>(),
    // The Game's `Opening` per chess.com's own classification, resolved once at
    // import from the PGN's [ECO]/[ECOUrl] headers (ADR-0007). `eco` is the
    // identity (the sentinel "other" when chess.com did not classify the Game);
    // `openingName` is the human-readable display name. The defaults fill
    // pre-existing rows on migration — the real values come from re-importing
    // (dev-phase rule: re-import is cheap, no backfill machinery).
    eco: text("eco").notNull().default("other"),
    openingName: text("opening_name").notNull().default("Autre / non classée"),
    // Set once this Game's Moves have been folded into the move_habits counters,
    // so the pre-aggregated totals cannot be double-counted (ADR-0005).
    moveHabitsComputed: integer("move_habits_computed", { mode: "boolean" })
      .notNull()
      .default(false),
    // Set once this Game has been through the engine analysis pass and its per-ply
    // `Evaluation`s are stored (ADR-0009, US-4). The analysis twin of
    // `moveHabitsComputed`: makes the pass incremental and idempotent, so already-
    // analyzed Games are skipped and their Evaluations are never recomputed.
    analyzed: integer("analyzed", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [unique().on(t.profileId, t.gameUrl)],
);

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
/**
 * A Game **before it has an owner**: the shape fixtures and seeds describe, the
 * `Profile` being supplied by whoever seeds them. Nothing is ever *stored* in
 * this shape — the column is `NOT NULL` (ADR-0014).
 */
export type UnownedGame = Omit<NewGame, "profileId">;

/**
 * Raw per-ply engine `Evaluation`s (ADR-0009), one row per analyzed Position of
 * a Game: `ply` 0 is the initial Position, `ply` N the Position after the N-th
 * half-move. Exactly one of `cp` (centipawns, side-to-move relative) or `mate`
 * (signed mate-in-N) is set. We store **only** these raw Evaluations and derive
 * move quality (`Inaccuracy`/`Mistake`/`Blunder`) and `Danger position`s on the
 * fly (slice B), so thresholds, the look-ahead window and the cp→win% curve can
 * change with no engine re-run.
 */
export const evaluations = sqliteTable(
  "evaluations",
  {
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id),
    ply: integer("ply").notNull(),
    // The Position this Evaluation is *of*, as the `Analysis pass` computed it
    // to query the engine (ADR-0012). Required, so no insert path can omit it
    // and no read path has a null to reason about. Denormalised against the
    // Game's PGN, which is accepted: Import dedups by game URL and source PGNs
    // are immutable.
    fen: text("fen").notNull(),
    cp: integer("cp"),
    mate: integer("mate"),
    // The `Best line` from this Position (CONTEXT.md), **whole**, in UCI, as the
    // engine printed it — one space-separated column, the best move being its
    // **head** (ADR-0016). Deliberately not a `bestmove` column beside it: two
    // places for the same fact is one place too many, and they could diverge.
    // Required: an Evaluation with no line is what this app used to store, and
    // keeping such rows would make every read path branch on their absence
    // forever (the legacy rows are dropped instead — named exception to ADR-0015).
    pv: text("pv").notNull(),
    // The **score of the engine's second-best line** (`cp2`/`mate2`), never its
    // variation: what says whether the best move was the only one worth playing.
    // Both null when there was no second line at all — a Position with a single
    // legal move — which is a fact, not a gap.
    cp2: integer("cp2"),
    mate2: integer("mate2"),
    // The `Analysis pass` that wrote this row, hence the `Search regime` it was
    // produced under. The relation that was missing: a pass's `game_ids` is a
    // JSON array, so nothing joined an Evaluation to its provenance.
    passId: integer("pass_id").references(() => analysisPasses.id),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.ply] })],
);

export type Evaluation = typeof evaluations.$inferSelect;
export type NewEvaluation = typeof evaluations.$inferInsert;

/**
 * One row per `Analysis pass` (ADR-0011, US-8). Records what a pass **is** — the
 * Games it covers (`game_ids`, a JSON array), how many Positions it set out to
 * evaluate (`total`), and when it started and ended — so the Player's readout
 * survives a page reload and a restart, instead of dying with the process.
 *
 * Deliberately carries **no progress column**: `done` is derived by counting the
 * pass's `evaluations` rows. Those rows *are* the progress, and a second figure
 * would drift the moment the process died between an insert and an increment.
 */
export const analysisPasses = sqliteTable("analysis_passes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // The `Profile` this pass ran for (ADR-0014): engine time is spent on one
  // Player's Games, and the pass is reported on that Player's page.
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id),
  gameIds: text("game_ids", { mode: "json" }).notNull().$type<number[]>(),
  total: integer("total").notNull(),
  // The `Search regime` (CONTEXT.md): the depth searched and how many lines. On
  // the pass and not repeated on every Evaluation — provenance is a property of
  // the run. Defaulted so the column can exist on rows that predate it; every
  // pass opened from now on states its own.
  depth: integer("depth").notNull().default(0),
  lines: integer("lines").notNull().default(0),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  // How the pass ended (CONTEXT.md, `Analysis pass`): `completed` when every
  // Position was evaluated, `interrupted` when the app was shut down mid-pass,
  // `failed` when the engine errored — `error` then carries what went wrong.
  // Null while the pass is still running.
  outcome: text("outcome").$type<"completed" | "interrupted" | "failed">(),
  error: text("error"),
  // When the Player dismissed this pass's summary. Display only: it hides the
  // summary and changes neither what the pass did nor the Evaluations it kept.
  acknowledgedAt: text("acknowledged_at"),
});

export type AnalysisPass = typeof analysisPasses.$inferSelect;

/**
 * Pre-aggregated `Move habit` counters (ADR-0005), keyed by the Position a Move
 * was played from (`fen`: the 4-field FEN — placement, active colour, castling,
 * en passant — so transpositions merge; see CONTEXT.md), the side the Player
 * played (`side`), and the Move (`san`). Records every half-move of a Game up
 * to the depth cap: the Player's own Moves and the opponent's replies alike.
 * `count` = games in which that Move was played from that Position (for that
 * side); `win`/`draw`/`loss` are Player-relative (for standard-scoring win
 * rate); `bullet`/`blitz`/`rapid`/`classical`/`correspondence` break `count` down by
 * time control.
 */
export const moveHabits = sqliteTable(
  "move_habits",
  {
    // Part of the key, not a mere column (ADR-0014): two Profiles reaching the
    // same Position and playing the same Move keep two counters, so one
    // player's repertoire can never be added into another's.
    profileId: integer("profile_id")
      .notNull()
      .references(() => profiles.id),
    fen: text("fen").notNull(),
    side: text("side").notNull().$type<"white" | "black">(),
    san: text("san").notNull(),
    count: integer("count").notNull().default(0),
    win: integer("win").notNull().default(0),
    draw: integer("draw").notNull().default(0),
    loss: integer("loss").notNull().default(0),
    bullet: integer("bullet").notNull().default(0),
    blitz: integer("blitz").notNull().default(0),
    rapid: integer("rapid").notNull().default(0),
    classical: integer("classical").notNull().default(0),
    correspondence: integer("correspondence").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.fen, t.side, t.san] })],
);

export type MoveHabit = typeof moveHabits.$inferSelect;

/**
 * Key-value app settings (single-user, local — ADR-0002). Currently holds the
 * Player's chess.com username so it is remembered across sessions.
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/**
 * The `Personal analysis` (CONTEXT.md): the Player's own reading of one Game,
 * written by hand. **One row per Game** (`game_id` unique) and filed under a
 * `Profile` (ADR-0014) — the reading of a friend's Game belongs to that friend's
 * Profile and is never merged across Profiles.
 *
 * Relational, not an annotated PGN blob (ADR-0019): the confrontation US-16b
 * builds is a **join** against the engine's per-Move record, which is keyed by
 * `(game, ply)` — the very key `personal_marks` below uses. An annotated PGN is
 * an export of this, never the stored form.
 *
 * It has **no upstream at all**: nothing can rebuild it, which is why ADR-0015
 * applies in full and the migration that creates these tables is additive and
 * re-runnable.
 *
 * `sealedAt` / `engineSeenBeforeSeal` are the **seal** and its **provenance**
 * (US-16a slice 04): null while the reading is still open, and the provenance is
 * only ever written at the moment of sealing — before that there is nothing to
 * be honest *about*. The provenance is a label ("read unaided" / "read
 * informed"), never a claim that the app prevented anyone from looking.
 */
export const personalAnalyses = sqliteTable("personal_analyses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("game_id")
    .notNull()
    .unique()
    .references(() => games.id, { onDelete: "cascade" }),
  profileId: integer("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull(),
  sealedAt: text("sealed_at"),
  engineSeenBeforeSeal: integer("engine_seen_before_seal", { mode: "boolean" }),
});

export type PersonalAnalysisRow = typeof personalAnalyses.$inferSelect;

/**
 * One **mark** of a `Personal analysis`, keyed by `(analysis, ply)` — `ply` 0
 * being the starting Position, exactly as for an `Evaluation`, which is what
 * carries a `Note` about the Game as a whole.
 *
 * Marks exist on **every** ply, the opponent's Moves included: nothing in the
 * model distinguishes the side. It is the confrontation (US-16b) that only ever
 * scores the Player's own Moves, and the screen that says so while the Player
 * judges an opponent's Move.
 *
 * **Silence is not a value.** A Move the Player did not examine has no row, or a
 * row whose columns are null — never a sentinel. That is what lets US-16b keep
 * **coverage** and **correctness** apart instead of folding one into the other.
 *
 * `posterior` marks what was written **after the seal** (US-16a slice 04): kept,
 * shown as such, and out of the comparison.
 */
export const personalMarks = sqliteTable(
  "personal_marks",
  {
    analysisId: integer("analysis_id")
      .notNull()
      .references(() => personalAnalyses.id, { onDelete: "cascade" }),
    ply: integer("ply").notNull(),
    declaredSeverity: text("declared_severity").$type<DeclaredSeverity>(),
    note: text("note"),
    keyMoment: integer("key_moment", { mode: "boolean" }).notNull().default(false),
    posterior: integer("posterior", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.analysisId, t.ply] })],
);

export type PersonalMarkRow = typeof personalMarks.$inferSelect;
