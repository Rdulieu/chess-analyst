import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { openDb } from "./db";
import { seedDangerFixture } from "./danger/fixture";

// Same SQLite file the server uses (ADR-0003); override with DB_FILE for the
// agentic Feature Path (which points at a throwaway database).
const here = dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE ?? resolve(here, "..", "chess-analyst.db");

const { db } = openDb(DB_FILE);
seedDangerFixture(db);
console.log(`Seeded the Danger position fixture dataset into ${DB_FILE}.`);
