import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { resetProvenance } from "../src/repair/reset-provenance";

/**
 * The one-off correction of US-28: readings whose provenance was stamped
 * "engine seen" by the defect that story fixes — the level inherited from
 * another Game, applied at mount, before the Player had read anything.
 *
 * **What authorises this write is not a rule, it is a statement of fact.**
 * `CONTEXT.md` forbids the app to GUESS a provenance: every fallback is "not
 * seen" and nothing is ever inferred. That forbids the *application* to infer;
 * it does not forbid the Player from stating a fact about their own readings.
 * The requester stated it on 2026-09-03: every reading so far was made unaided.
 *
 * **And the error runs the other way.** Setting a flag back to "not seen" is the
 * INVERSE mistake of the one US-28 fixes: it flatters the Player and overrates
 * the `Confrontation`, where the original defect discredited them. It is covered
 * here by the requester's statement and by nothing else — which is exactly why
 * the scope is a list of ids rather than a predicate: a predicate would keep
 * being true for readings nobody has spoken for.
 */
const dirs: string[] = [];
function tempDb(): string {
  const dir = mkdtempSync(join(tmpdir(), "chess-analyst-reset-"));
  dirs.push(dir);
  const file = join(dir, "test.db");
  const db = new Database(file);
  db.exec(`
    CREATE TABLE personal_analyses (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      game_id integer NOT NULL,
      profile_id integer NOT NULL,
      created_at text NOT NULL,
      sealed_at text,
      engine_seen_before_seal integer
    );
    INSERT INTO personal_analyses (id, game_id, profile_id, created_at, sealed_at, engine_seen_before_seal) VALUES
      (1, 271, 2, '2026-08-01', NULL,         NULL),
      (2, 166, 1, '2026-08-25', '2026-08-25', 0),
      (3, 161, 1, '2026-09-01', '2026-09-01', 0),
      (4, 715, 3, '2026-09-02', '2026-09-02', 1);
  `);
  db.close();
  return file;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function rows(file: string) {
  const db = new Database(file, { readonly: true });
  const all = db
    .prepare("SELECT id, engine_seen_before_seal AS seen FROM personal_analyses ORDER BY id")
    .all() as { id: number; seen: number | null }[];
  db.close();
  return all;
}

describe("resetting a provenance that the app stamped without being asked", () => {
  it("clears the named reading, and reports that it changed one", () => {
    const file = tempDb();

    const result = resetProvenance(file, [4]);

    expect(result.changed).toBe(1);
    expect(rows(file)).toEqual([
      { id: 1, seen: null },
      { id: 2, seen: 0 },
      { id: 3, seen: 0 },
      { id: 4, seen: 0 },
    ]);
  });

  it("touches nothing but the readings it was named", () => {
    // The open reading keeps its NULL rather than being "corrected" to 0: a
    // provenance is written at sealing, and there is nothing yet to be honest
    // about. Turning it into a value would invent one.
    const file = tempDb();

    resetProvenance(file, [4]);

    expect(rows(file)[0]).toEqual({ id: 1, seen: null });
  });

  it("changes nothing on a second run — this is re-runnable, not run-once", () => {
    // Observed, not assumed. A correction that is only safe the first time is a
    // correction nobody can verify without risking it.
    const file = tempDb();
    resetProvenance(file, [4]);

    const again = resetProvenance(file, [4]);

    expect(again.changed).toBe(0);
    expect(rows(file)[3]).toEqual({ id: 4, seen: 0 });
  });

  it("refuses an id that names no reading, rather than silently doing nothing", () => {
    // A typo in the one place where the scope is expressed must not read as
    // "nothing needed correcting".
    const file = tempDb();

    expect(() => resetProvenance(file, [4, 99])).toThrow(/99/);
    // And it refused before writing: the run is all or nothing.
    expect(rows(file)[3]).toEqual({ id: 4, seen: 1 });
  });

  it("declines to touch a reading that is not sealed", () => {
    // Belt and braces on the scope. An unsealed reading has no provenance to
    // reset, so naming one is a mistake in the list rather than a no-op.
    const file = tempDb();

    expect(() => resetProvenance(file, [1])).toThrow(/1/);
  });
});
