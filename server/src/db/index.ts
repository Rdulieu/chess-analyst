import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

/**
 * Idempotent schema creation. Runs on every launch so the database is
 * usable the first time the app starts, with no manual migration step
 * (ADR-0003, "schema created automatically on first launch").
 *
 * The DDL is kept in lock-step with `schema.ts` by hand. That is a
 * deliberate trade-off: Drizzle was chosen partly for having no codegen
 * step (ADR-0003), so we prefer this small, readable `CREATE TABLE IF NOT
 * EXISTS` over generating and shipping migration files for a single table.
 */
export function createSchema(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pgn TEXT NOT NULL,
      opponent TEXT NOT NULL,
      result TEXT NOT NULL,
      date TEXT NOT NULL,
      time_control_category TEXT NOT NULL
    );
  `);
}

/** Opens (creating if needed) the SQLite database and applies the schema. */
export function openDb(filename: string): { db: Db; sqlite: Database.Database } {
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  createSchema(sqlite);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}
