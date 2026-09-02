import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { openDb } from "../db";
import { evaluations, games } from "../db/schema";
import { getGameAnnotations } from "../annotations/repository";
import { gameReport, type GameReport } from "./report";
import type { SignalThresholds, StoredLine } from "./signals";

/**
 * The **thin envelope** around `gameReport` (D7): it opens the database, prints,
 * and computes nothing. Everything worth testing is in the function it calls,
 * which is why this file has no test of its own and must stay this dull — the
 * moment a rule of the method appears here, it is in the wrong place.
 *
 *   DB_FILE=… npx tsx src/review/report-cli.ts 165 715 [--json]
 *                                              [--set material=2 --set cpDrop=50]
 *                                              [--reference lichess.json]
 *
 * `--reference` takes a JSON object of `gameId -> plies flagged elsewhere`: the
 * lichess reports, which are the one datum nothing here derives and which are
 * therefore entered by hand (SEAMS — they enter as fixtures and are never
 * asserted).
 */
const here = dirname(fileURLToPath(import.meta.url));
const DB_FILE = process.env.DB_FILE ?? resolve(here, "..", "..", "chess-analyst.db");

const argv = process.argv.slice(2);
const json = argv.includes("--json");
const ids = argv.filter((arg) => /^\d+$/.test(arg)).map(Number);
const thresholds = Object.fromEntries(
  argv
    .flatMap((arg, i) => (arg === "--set" ? [argv[i + 1]] : []))
    .map((pair) => pair.split("="))
    .map(([key, value]) => [key, Number(value)]),
) as Partial<SignalThresholds>;
const referencePath = argv[argv.indexOf("--reference") + 1];
const reference: Record<string, number[]> =
  argv.includes("--reference") ? JSON.parse(readFileSync(referencePath, "utf8")) : {};

if (ids.length === 0) {
  console.error("Give at least one Game id. See the header of this file.");
  process.exit(1);
}

const { db } = openDb(DB_FILE);

for (const id of ids) {
  const game = db.select().from(games).where(eq(games.id, id)).get();
  if (!game) {
    console.error(`Game ${id}: no such Game in ${DB_FILE}.`);
    continue;
  }
  // The regime comes from the read path the app itself uses, rather than being
  // joined again here: one provenance, one implementation.
  const annotations = getGameAnnotations(db, id);
  if (!annotations?.analyzed) {
    console.error(`Game ${id}: not analyzed — nothing to report on.`);
    continue;
  }
  const rows = db.select().from(evaluations).where(eq(evaluations.gameId, id)).all() as StoredLine[];

  const report = gameReport(game, rows, {
    regime: annotations.regime,
    thresholds,
    flaggedElsewhere: reference[String(id)],
  });

  if (json) {
    console.log(JSON.stringify({ gameId: id, ...report }));
    continue;
  }
  print(id, game.opponent, report);
}

/** One Game, as a human reads it: a line per Player Move, then what they add up to. */
function print(id: number, opponent: string, report: GameReport): void {
  const { recap } = report;
  console.log(
    `\n=== Game ${id} vs ${opponent} — ${recap.countedMoves}/${recap.playerMoves} counted, ` +
      `${recap.chancesLost.toFixed(1)}% lost (${recap.drift.toFixed(1)} of drift), ` +
      `regime ${recap.regime ? `depth ${recap.regime.depth} / ${recap.regime.lines} lines` : "unknown"}`,
  );
  console.log(
    ["ply", "move", "sev", "counted", "lost", "mat", "mate", "cp", "forced", "2nd", "phase", "opp", "fires"].join("\t"),
  );
  for (const row of report.rows) {
    console.log(
      [
        row.ply,
        row.san,
        row.severity ?? "-",
        row.counted.counted ? "yes" : (row.counted.reason ?? "no"),
        row.chancesLost.toFixed(1),
        row.signals.material,
        `${row.signals.mate.before ?? "-"}>${row.signals.mate.after ?? "-"}`,
        row.signals.cpDrop ?? "-",
        `${row.signals.forced.move ? "M" : "-"}${row.signals.forced.reply ? "R" : "-"}`,
        row.signals.secondLine.only ? "only" : (row.signals.secondLine.gap ?? "-"),
        row.phase.kept === row.phase.onNumber ? row.phase.kept : `${row.phase.kept}|${row.phase.onNumber}`,
        row.opponentReply === null
          ? "-"
          : `${row.opponentReply.severity ?? (row.opponentReply.counted.counted ? "ok" : row.opponentReply.counted.reason)}`,
        Object.entries(row.designated)
          .filter(([, fires]) => fires)
          .map(([name]) => name)
          .join(",") || "-",
      ].join("\t"),
    );
  }
  const { shownByNoOne, missedBySignals } = report.attention;
  console.log(
    `-- shown by no one (a signal fires, nothing flags it): ${
      shownByNoOne.map((row) => `${row.ply} ${row.san}`).join(", ") || "none"
    }`,
  );
  console.log(
    `-- missed by every signal (flagged elsewhere, no signal): ${
      missedBySignals === null
        ? "no outside reference given"
        : missedBySignals.map((row) => `${row.ply} ${row.san}`).join(", ") || "none"
    }`,
  );
  // The reconciliation of ADR-0017, printed rather than trusted: if these two
  // lines ever disagree, the report is measuring something else than the app.
  console.log(
    `-- folded from the lines: ${report.totals.countedMoves}/${report.totals.playerMoves} counted, ` +
      `${report.totals.chancesLost.toFixed(1)}% lost — ${
        report.totals.chancesLost.toFixed(6) === recap.chancesLost.toFixed(6) ? "agrees with the recap" : "DISAGREES with the recap"
      }`,
  );
}
