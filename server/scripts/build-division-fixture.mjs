/**
 * Regenerates `test/fixtures/lichess-division.json` — the oracle the `Phase`
 * derivation is replayed against (ADR-0035).
 *
 * Every Game of the local base that carries a `Lichess division`, reduced to
 * what the check needs: its movetext (clock comments stripped) and the two
 * plies lichess published. The local database is **not** committed (ADR-0003),
 * so the oracle has to be extracted once and travel with the test.
 *
 *   node scripts/build-division-fixture.mjs
 */
import Database from "better-sqlite3";
import { writeFileSync } from "node:fs";

const db = new Database("chess-analyst.db", { readonly: true });
const rows = db
  .prepare(
    `SELECT id, pgn, division_middle_ply AS middle, division_end_ply AS endPly
       FROM games
      WHERE division_middle_ply IS NOT NULL OR division_end_ply IS NOT NULL
      ORDER BY id`,
  )
  .all();

const games = rows.map((row) => ({
  id: row.id,
  moves: row.pgn
    .split("\n")
    .filter((line) => !line.startsWith("["))
    .join(" ")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\s+/g, " ")
    .trim(),
  middle: row.middle,
  end: row.endPly,
}));

// One Game per line: the file is committed, so a regeneration has to produce a
// diff somebody can read. Indented JSON would double its size for nothing.
const body = games.map((game) => `  ${JSON.stringify(game)}`).join(",\n");
writeFileSync("test/fixtures/lichess-division.json", `[\n${body}\n]\n`);
// The count is asserted in `test/phase.test.ts` — on purpose, so a truncated
// extract fails loudly rather than checking fewer Games in silence. Regenerating
// on a larger base is legitimate; update the expected count in the same commit.
console.log(`${games.length} games written — expected by test/phase.test.ts`);
