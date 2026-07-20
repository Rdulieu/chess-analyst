import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

/**
 * The `games` table models the `Game` glossary term (see CONTEXT.md):
 * an imported chess.com match with its PGN, opponent, result, date and
 * time control category. No Evaluation/Mistake storage yet — that arrives
 * with US-4.
 */
export const games = sqliteTable("games", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pgn: text("pgn").notNull(),
  opponent: text("opponent").notNull(),
  result: text("result").notNull(),
  date: text("date").notNull(),
  timeControlCategory: text("time_control_category").notNull(),
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
