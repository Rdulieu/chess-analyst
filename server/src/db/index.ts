import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

// Migrations generated from schema.ts via `npm run db:generate -w server`
// (drizzle-kit) and committed under ./migrations.
const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "migrations");

/**
 * Opens (creating if needed) the SQLite database and brings its schema up to
 * date by running the committed Drizzle migrations. Runs on every launch, so
 * the database is usable the first time the app starts with no manual step
 * (ADR-0003, "schema created automatically on first launch").
 */
export function openDb(filename: string): { db: Db; sqlite: Database.Database } {
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return { db, sqlite };
}
