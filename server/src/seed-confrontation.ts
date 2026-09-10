import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { openDb } from "./db";
import { resolveProfile } from "./profiles/repository";
import { seedConfrontationFixture } from "./personal/confrontation-fixture";

/**
 * Seeds the `Confrontation` fixture US-26's Feature Paths run on (US-26, slice 01).
 *
 * Same SQLite file the server uses (ADR-0003); override with `DB_FILE` to point
 * at a throwaway database.
 *
 * **Re-runnable and non-destructive.** It rewrites its own Game's
 * `Evaluation`s and reading and nothing else — no other Game, no other reading,
 * and above all no other `Analysis pass`, since import rebuilds Games cheaply
 * and **nothing rebuilds an `Evaluation`** (ADR-0015).
 */
const here = dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE ?? resolve(here, "..", "chess-analyst.db");

const { db } = openDb(DB_FILE);
// A fabricated Game needs an owner like any other (ADR-0014), and its own
// Profile so the seeded reading never lands in a real Player's history.
const { profile } = resolveProfile(db, "chesscom", "fixture-reader");
const gameId = seedConfrontationFixture(db, profile.id);

console.log(
  `Seeded the Confrontation fixture (game ${gameId}, profile ${profile.id}) into ${DB_FILE}.`,
);
console.log(`Confrontation: /analyse/${gameId}/confrontation`);
