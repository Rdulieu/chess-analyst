import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";
import { repairMissingFens } from "./repair";

export type Db = BetterSQLite3Database<typeof schema>;

// Migrations generated from schema.ts via `npm run db:generate -w server`
// (drizzle-kit) and committed under ./migrations.
const migrationsFolder = resolve(dirname(fileURLToPath(import.meta.url)), "migrations");

/**
 * Opens (creating if needed) the SQLite database and brings its schema up to
 * date by running the committed Drizzle migrations. Runs on every launch, so
 * the database is usable the first time the app starts with no manual step
 * (ADR-0003, "schema created automatically on first launch").
 *
 * Integrity is brought up to date in the same breath: `Evaluation`s stored
 * before the `fen` column existed are repaired from their Game's PGN
 * (ADR-0012). Idempotent — a second launch finds nothing to do, which
 * `repairedEvaluations` reports.
 */
export function openDb(filename: string): {
  db: Db;
  sqlite: Database.Database;
  repairedEvaluations: number;
} {
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });

  // A migration that tightens a column to NOT NULL has to rebuild its table,
  // and SQLite's own procedure for that requires foreign keys to be off: the
  // table is dropped and recreated, so anything referencing it is momentarily
  // orphaned even though the ids are preserved. `defer_foreign_keys` is not
  // enough — it counts violations rather than re-checking them. So the keys go
  // off for the migrations and `foreign_key_check` speaks for them afterwards:
  // a rebuild that really did lose a reference fails loudly (ADR-0015) instead
  // of leaving the database quietly inconsistent.
  sqlite.pragma("foreign_keys = OFF");
  migrate(db, { migrationsFolder });
  sqlite.pragma("foreign_keys = ON");
  const broken = sqlite.pragma("foreign_key_check") as unknown[];
  if (broken.length > 0) {
    throw new Error(
      `Migration left ${broken.length} broken foreign key reference(s); the database was not upgraded safely.`,
    );
  }

  return { db, sqlite, repairedEvaluations: repairMissingFens(db) };
}
