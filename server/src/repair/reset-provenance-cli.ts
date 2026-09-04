import Database from "better-sqlite3";
import { resetProvenance } from "./reset-provenance";

/**
 * Runs the US-28 provenance correction against a real database, and **shows its
 * work**: the readings before, the backup it took, the rows it changed, the
 * readings after.
 *
 * The backup is not ceremony. ADR-0015: this database holds `Evaluation`s that
 * only engine time can rebuild, so any hand-run write against it takes a copy
 * first — and takes it with `.backup` rather than a file copy. Measured on this
 * project 2026-08-27: a `cp` of a database with a live `-wal` produced a copy
 * that **read back clean while having silently lost a whole table**. `.backup`
 * reads through an unmerged WAL; a file copy does not.
 *
 * Usage: `npm run repair:provenance -w server -- <db-file> <id> [id…]`
 */
function readings(file: string) {
  const db = new Database(file, { readonly: true });
  try {
    return db
      .prepare(
        `SELECT id, game_id, profile_id, sealed_at, engine_seen_before_seal
           FROM personal_analyses ORDER BY id`,
      )
      .all() as Record<string, unknown>[];
  } finally {
    db.close();
  }
}

async function main() {
  const [file, ...rawIds] = process.argv.slice(2);
  if (!file || rawIds.length === 0) {
    throw new Error("usage: reset-provenance-cli <db-file> <analysis-id> [analysis-id…]");
  }
  const ids = rawIds.map((raw) => {
    const id = Number(raw);
    if (!Number.isInteger(id)) throw new Error(`not an analysis id: ${raw}`);
    return id;
  });

  console.log("Lectures AVANT :");
  console.table(readings(file));

  const backup = `${file}.pre-US28-02.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
  const source = new Database(file);
  try {
    await source.backup(backup);
  } finally {
    source.close();
  }
  // Read the copy back before trusting it. This catches corruption — a malformed
  // image, a table that will not open — and it is blind to silent loss, which is
  // what `.backup` above is for. The two halves catch different things and
  // neither substitutes for the other.
  console.log(`\nSauvegarde : ${backup} (${readings(backup).length} lectures relues)`);

  const { changed } = resetProvenance(file, ids);
  console.log(`\nLignes modifiées : ${changed}`);

  console.log("\nLectures APRÈS :");
  console.table(readings(file));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
