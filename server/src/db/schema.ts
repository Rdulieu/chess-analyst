import { sqliteTable, integer, text, primaryKey } from "drizzle-orm/sqlite-core";

/**
 * The `games` table models the `Game` glossary term (see CONTEXT.md): an
 * imported chess.com match, recorded from the Player's point of view. It carries
 * the chess.com game URL (the immutable dedup key for incremental Import), the
 * side the Player played, the Player-relative result, the opponent, the date and
 * the time control category. No Evaluation/Mistake storage yet — that arrives
 * with US-4.
 */
export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameUrl: text("game_url").notNull().unique(),
  pgn: text("pgn").notNull(),
  opponent: text("opponent").notNull(),
  playerColor: text("player_color").notNull().$type<"white" | "black">(),
  result: text("result").notNull().$type<"win" | "loss" | "draw">(),
  date: text("date").notNull(),
  timeControlCategory: text("time_control_category")
    .notNull()
    .$type<"bullet" | "blitz" | "rapid" | "daily">(),
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
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

/**
 * Pre-aggregated `Move habit` counters (ADR-0005), keyed by the Position a Move
 * was played from (`fen`: the 4-field FEN — placement, active colour, castling,
 * en passant — so transpositions merge; see CONTEXT.md), the side the Player
 * played (`side`), and the Move (`san`). Records every half-move of a Game up
 * to the depth cap: the Player's own Moves and the opponent's replies alike.
 * `count` = games in which that Move was played from that Position (for that
 * side); `win`/`draw`/`loss` are Player-relative (for standard-scoring win
 * rate); `bullet`/`blitz`/`rapid`/`daily` break `count` down by time control.
 */
export const moveHabits = sqliteTable(
  "move_habits",
  {
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
    daily: integer("daily").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.fen, t.side, t.san] })],
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
