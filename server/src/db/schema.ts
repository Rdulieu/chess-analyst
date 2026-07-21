import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

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
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;

/**
 * Key-value app settings (single-user, local — ADR-0002). Currently holds the
 * Player's chess.com username so it is remembered across sessions.
 */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
