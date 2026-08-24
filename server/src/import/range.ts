import type { Db } from "../db";
import { games } from "../db/schema";
import { gameExistsByUrl } from "../repository";
import { recordMoveHabits } from "../move-habits/precompute";
import {
  type ImportedGame,
  type MonthRef,
  type Platform,
  type PlatformClient,
  type TimeControlCategory,
} from "../platform";
import { emptyTally, type ImportResult } from "./service";

/** The scope of one Import: a contiguous month range and the wanted categories. */
export interface ImportRangeParams {
  /** The `Profile` the imported Games belong to (ADR-0014). */
  profileId: number;
  username: string;
  /** The Profile's `Platform` — which adapter this Import fetches through. */
  platform: Platform;
  from: MonthRef;
  to: MonthRef;
  categories: TimeControlCategory[];
  /** Told when the Platform asks the Import to wait (see ImportParams). */
  onWaiting?: (message: string) => void;
}

/**
 * Imports a whole range, **folding the Platform's event stream** into the
 * summary as it arrives.
 *
 * The Import asks the port for the **range** and no longer slices it: how many
 * requests that takes is the Platform's business (ADR-0018, as amended). What
 * the Import still owns is everything the Player's choices govern — which paces
 * to keep, which Profile the Games are filed under — and the *reporting* unit,
 * which is still the month: one line per month of the range, drawn on that
 * month's `month-done` or `month-failed` event.
 *
 * Games are persisted **one at a time as they arrive**, deduplicated by URL.
 * That is what makes an interrupted Import partial rather than lost.
 *
 * `onMonthDone` hands the caller the summary **as it stands after each month**,
 * so a progress readout can show the lines filling in rather than waiting for the
 * whole range; the background job (createImportJob) is its only real user. It
 * receives a snapshot, not the live object, so a caller holding on to it cannot
 * be mutated from under it.
 */
export async function importRange(
  db: Db,
  client: PlatformClient,
  params: ImportRangeParams,
  onMonthDone?: (soFar: ImportResult) => void,
): Promise<ImportResult> {
  const total: ImportResult = {
    totalFetched: 0,
    imported: 0,
    alreadyPresent: 0,
    byCategory: emptyTally(),
    results: { win: 0, loss: 0, draw: 0 },
    months: [],
  };
  const wanted = new Set(params.categories);
  // The month being filled in. A month's line is only pushed when the Platform
  // says the month is over, so its counts accumulate here until then.
  let running = { imported: 0, alreadyPresent: 0 };
  // A Game the store refused, remembered until the month it belongs to closes.
  let unstorable: string | null = null;
  // Where the Platform's answer died, and the last month that came through in
  // FULL — the two facts the Player needs to finish the job themselves.
  let cutIn: MonthRef | null = null;
  let lastCovered: MonthRef | null = null;
  // The months the Platform never answered for. Kept because "nothing was
  // found" is a claim about what the range HELD, and an unanswered month was
  // never read — so it cannot back that claim, and it is what has to be re-run.
  const unanswered: MonthRef[] = [];

  for await (const event of client.fetchRange(params.username, params.from, params.to, {
    onWaiting: params.onWaiting,
  })) {
    if (event.kind === "game") {
      // Which paces to keep is the PLAYER's choice, not a Platform fact — so it
      // stays here while the variant filter lives in the adapter (ADR-0018).
      if (!wanted.has(event.game.timeControlCategory)) continue;
      total.byCategory[event.game.timeControlCategory]++;
      total.results[event.game.result]++;
      try {
        if (insert(db, params.profileId, event.game)) running.imported++;
        else running.alreadyPresent++;
      } catch (err) {
        // A Game whose PGN cannot be replayed fails **its month**, not the range
        // (ADR-0010). Inserting as the stream arrives is what makes an
        // interrupted Import partial rather than lost; it must not also make one
        // bad Game cost every month after it. Over-declaring this month
        // incomplete is the safe direction — the Player can re-run it.
        unstorable ??= err instanceof Error ? err.message : String(err);
      }
      continue;
    }
    if (event.kind === "stream-cut") {
      // Not a month line: the month it died in gets its own `month-failed` just
      // after this. What this carries is WHERE to resume, which no per-month
      // failure can say.
      cutIn = event.month;
      continue;
    }
    // The month is over, one way or another: draw its line.
    //
    // A month carries a `failure` if the Platform could not answer it, or if a
    // Game it did deliver could not be stored. Either way the range carries on
    // (ADR-0010) and whatever DID arrive has already been persisted above — the
    // port yields, so a partial month is partial rather than lost. Recovery is
    // replaying the range, which dedup by URL makes exact.
    // Both kinds carry it: a month that failed after some Games had arrived DID
    // receive them, and they are already persisted. Counting them as imported
    // without counting them as fetched made the summary claim it kept more than
    // the Platform gave.
    total.totalFetched += event.totalFetched;
    const failure = event.kind === "month-failed" ? event.reason : unstorable;
    // "Covered" means the month came through in full — a month whose own Game
    // could not be stored has NOT, so it must not become the resume point.
    if (failure === null) lastCovered = event.month;
    else unanswered.push(event.month);
    total.imported += running.imported;
    total.alreadyPresent += running.alreadyPresent;
    total.months.push({
      month: event.month,
      ...running,
      ...(failure === null ? {} : { failure }),
    });
    running = { imported: 0, alreadyPresent: 0 };
    unstorable = null;
    onMonthDone?.(snapshot(total));
  }

  // Three statements, in order of what the run actually established.
  //
  // An interruption outranks the rest: it is the only one that says where the
  // answer stopped coming. Then any unanswered month, because "nothing was
  // found" is a claim about what the range HELD and an unanswered month was
  // never read — the Player's one available wrong conclusion being "I did not
  // play in those months", which is exactly what the per-month lines exist to
  // prevent. Only when **every** month came through is an empty range a fact.
  if (cutIn !== null) total.message = interrupted(cutIn, params.to, lastCovered);
  else if (unanswered.length > 0) total.message = incomplete(unanswered, params.to);
  else if (total.imported === 0 && total.alreadyPresent === 0) {
    // Only reachable once **every** month came through: an empty range is then a
    // fact the run established, rather than a claim about months nobody read.
    total.message = `Aucune partie trouvée de ${yyyymm(params.from)} à ${yyyymm(params.to)} dans les cadences sélectionnées.`;
  }
  return total;
}

/**
 * What the Player is told when the Platform did not answer for part of the
 * range. Same three facts as an interruption, for the same reason: what went
 * wrong, that nothing already in hand is lost, and the exact range to re-run —
 * in the import form's own `YYYY-MM` vocabulary so it can be retyped as-is.
 *
 * It is said **whenever a month went unanswered**, whether or not other months
 * brought Games in. That reverses an earlier rule ("a partly successful Import is
 * not a failed one", which kept such a range globally silent): decided by the
 * requester on 2026-08-24, on the ground that silence left the Player to work the
 * gap out from the month lines themselves — which is precisely the job this
 * statement exists to do. A range that half worked still has a period that has to
 * be re-run, and it is now named.
 *
 * The re-run starts at the **first** unanswered month and ends at the range's own
 * end — not at the last unanswered one. Re-fetching a month that already
 * succeeded costs nothing (dedup by URL); leaving one out risks a permanent hole.
 */
function incomplete(unanswered: MonthRef[], to: MonthRef): string {
  const first = unanswered[0];
  const count = unanswered.length;
  const head =
    count === 1
      ? `Le mois ${yyyymm(first)} n'a pas pu être récupéré.`
      : `${count} mois n'ont pas pu être récupérés.`;
  return (
    `${head} Les parties déjà récupérées sont conservées. ` +
    `Pour compléter, relancez un import de ${yyyymm(first)} à ${yyyymm(to)}.`
  );
}

/**
 * What the Player is told when the answer stopped coming. Three facts, none
 * decorative: **where** it stopped, that nothing already fetched is lost, and
 * the **exact range** left to run — spelled in the import form's own `YYYY-MM`
 * vocabulary so it can be retyped as-is rather than worked out from a list of
 * month lines.
 *
 * The range starts at the month the stream died **in**, never after it: that
 * month is partial, and re-fetching it costs nothing (dedup by URL) while
 * announcing it covered would be a silent, permanent hole. We over-declare
 * incompleteness, never completeness.
 *
 * Without the "conservées" clause the Player assumes the whole Import has to be
 * redone — which is the one wrong conclusion available here.
 */
function interrupted(cutIn: MonthRef, to: MonthRef, lastCovered: MonthRef | null): string {
  const where =
    lastCovered === null
      ? "Le flux s'est interrompu avant qu'aucun mois ne soit couvert."
      : `Le flux s'est interrompu après ${yyyymm(lastCovered)}.`;
  return (
    `${where} Les parties récupérées sont conservées. ` +
    `Pour couvrir le reste, relancez un import de ${yyyymm(cutIn)} à ${yyyymm(to)}.`
  );
}

/** Files one Game under the Profile. `false` when that URL was already there. */
function insert(db: Db, profileId: number, game: ImportedGame): boolean {
  if (gameExistsByUrl(db, profileId, game.gameUrl)) return false;
  const inserted = db.insert(games).values({ ...game, profileId }).returning().get();
  recordMoveHabits(db, inserted);
  return true;
}

/** A detached copy, so a caller keeping the partial summary is never mutated. */
const snapshot = (r: ImportResult): ImportResult => ({
  ...r,
  byCategory: { ...r.byCategory },
  results: { ...r.results },
  months: [...r.months],
});

const yyyymm = ({ year, month }: MonthRef) => `${year}-${String(month).padStart(2, "0")}`;
