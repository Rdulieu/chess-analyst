import Database from "better-sqlite3";
import { openDb } from "../db";
import { createHttpLichessClient } from "../platform";
import { refreshClocks, type RefreshedGame } from "./refresh-clocks";

/**
 * Brings the clocks back for the Lichess Games already in the database
 * (US-15b, slice 05), and **shows its work**: the readings before, the backup it
 * took, the rows it changed, the readings after.
 *
 * ## Why a one-off CLI and not a button
 *
 * The correction is **434 rows, once**. A button in the app would be a
 * **permanent** surface for a **temporary** need, and folding the refresh into
 * the ordinary import is worse: it would make "already present" a write, and
 * ADR-0030's assertion would then start failing **during a routine import**.
 * Future imports carry the clocks from the start (slice 04), so this never
 * returns.
 *
 * ## Why it covers all 434 and not the 318 of blitz + rapid
 *
 * A partial refresh would make "no clock" mean **two things at once** — *not
 * applicable* for a correspondence Game, *never asked for* for a `classical`
 * one — which is exactly the confusion the whole feature is built to remove.
 *
 * ## The backup
 *
 * Not ceremony. ADR-0015: this database holds `Evaluation`s only engine time can
 * rebuild, so any hand-run write takes a copy first — with **`.backup`, never a
 * `cp`**. Measured on this project 2026-08-27: a `cp` of a database with a live
 * `-wal` produced a copy that **read back clean while having silently lost a
 * whole table**. `.backup` reads through an unmerged WAL; a file copy does not.
 * The copy is then read back, which catches corruption and is blind to silent
 * loss — the two halves catch different things and neither replaces the other.
 *
 * Usage: `npm run repair:clocks -w server -- <db-file> <lichess-username> [more…]`
 */
function counts(file: string) {
  const db = new Database(file, { readonly: true });
  try {
    return db
      .prepare(
        `SELECT p.username,
                COUNT(*) AS games,
                SUM(CASE WHEN g.pgn LIKE '%[%clk%' THEN 1 ELSE 0 END) AS with_clocks,
                SUM(g.analyzed) AS analyzed,
                SUM(CASE WHEN g.last_clock_cs IS NOT NULL THEN 1 ELSE 0 END) AS last_clocks,
                SUM(CASE WHEN g.division_middle_ply IS NOT NULL THEN 1 ELSE 0 END) AS divisions
           FROM games g JOIN profiles p ON p.id = g.profile_id
          WHERE p.platform = 'lichess'
          GROUP BY p.username ORDER BY p.username`,
      )
      .all() as Record<string, unknown>[];
  } finally {
    db.close();
  }
}

/** Every Evaluation's identity, so "intact" can be asserted rather than hoped. */
function evaluationFingerprint(file: string): string {
  const db = new Database(file, { readonly: true });
  try {
    const row = db
      .prepare("SELECT COUNT(*) AS n, SUM(COALESCE(cp,0)) AS cp, SUM(LENGTH(fen)) AS fen FROM evaluations")
      .get() as Record<string, number>;
    return `${row.n} lignes / cp ${row.cp} / fen ${row.fen}`;
  } finally {
    db.close();
  }
}

/**
 * Every Lichess Game of one account, re-exported **with** its clocks and its
 * division. One range request for the whole history, which is what the throttle
 * makes necessary: `/api/games/user` answered ten consecutive `429`s from this
 * address on 2026-09-08, and Game by Game this would be 434 requests.
 */
async function reExport(username: string): Promise<RefreshedGame[]> {
  const client = createHttpLichessClient();
  const refreshed: RefreshedGame[] = [];
  // The whole span: from before Lichess existed to next month. The adapter
  // yields per month, and every month of the range gets its own line.
  const from = { year: 2010, month: 1 };
  const now = new Date();
  const to = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 2 };

  for await (const event of client.fetchRange(username, from, to, {
    onWaiting: (message) => console.log(`  … ${message}`),
  })) {
    if (event.kind === "game") {
      refreshed.push({
        gameUrl: event.game.gameUrl,
        pgn: event.game.pgn,
        lastClockCs: event.game.lastClockCs,
        divisionMiddlePly: event.game.divisionMiddlePly,
        divisionEndPly: event.game.divisionEndPly,
      });
    }
    if (event.kind === "month-failed") {
      console.log(`  mois non répondu : ${event.month.year}-${event.month.month} (${event.reason})`);
    }
  }
  return refreshed;
}

async function main() {
  const [file, ...usernames] = process.argv.slice(2);
  if (!file || usernames.length === 0) {
    throw new Error("usage: refresh-clocks-cli <db-file> <lichess-username> [lichess-username…]");
  }

  console.log("Parties lichess AVANT :");
  console.table(counts(file));
  const before = evaluationFingerprint(file);
  console.log(`Evaluations AVANT : ${before}`);

  const backup = `${file}.pre-US15b-05.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
  const source = new Database(file);
  try {
    await source.backup(backup);
  } finally {
    source.close();
  }
  console.log(`\nSauvegarde : ${backup} (${evaluationFingerprint(backup)} relues)`);

  const refreshed: RefreshedGame[] = [];
  for (const username of usernames) {
    console.log(`\nRé-export de ${username} (clocks=true, division=true)…`);
    const got = await reExport(username);
    console.log(`  ${got.length} parties rapportées`);
    refreshed.push(...got);
  }

  // `openDb` rather than a bare connection: the migration adding the three
  // columns must have run before anything tries to write them.
  const { db, sqlite } = openDb(file);
  try {
    const outcome = refreshClocks(db, refreshed);
    console.log(
      `\nLignes modifiées : ${outcome.changed}` +
        ` · déjà pourvues : ${outcome.alreadyDone}` +
        ` · non importées : ${outcome.notImported}`,
    );
  } finally {
    sqlite.close();
  }

  console.log("\nParties lichess APRÈS :");
  console.table(counts(file));
  const after = evaluationFingerprint(file);
  console.log(`Evaluations APRÈS : ${after}`);
  // The claim ADR-0030 rests on, checked out loud rather than assumed: same
  // moves ⇒ same FENs ⇒ the Evaluations are the ones that were there before.
  console.log(
    before === after
      ? "→ Evaluations intactes (empreinte identique)."
      : "→ ATTENTION : l'empreinte des Evaluations a changé.",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
