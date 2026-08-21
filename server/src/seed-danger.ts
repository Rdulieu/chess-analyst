import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { openDb } from "./db";
import { resolveProfile } from "./profiles/repository";
import { seedDangerFixture } from "./danger/fixture";

// Same SQLite file the server uses (ADR-0003); override with DB_FILE for the
// agentic Feature Path (which points at a throwaway database).
const here = dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE ?? resolve(here, "..", "chess-analyst.db");

const { db } = openDb(DB_FILE);
// Fabricated Games need an owner like any other (ADR-0014). The fixture has
// its own Profile so seeded data never lands in a real Player's history.
const { profile } = resolveProfile(db, "chesscom", "fixture-player");
seedDangerFixture(db, profile.id);
console.log(`Seeded the Danger position fixture dataset into ${DB_FILE}.`);
