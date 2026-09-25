import { eq, inArray } from "drizzle-orm";
import { crossedSignatures } from "../analysis/crossed";
import { phases, PHASES, type Phase } from "../analysis/phase";
import { gameRecap } from "../analysis/recap";
import { gamePositions } from "../chess/positions";
import type { Db } from "../db";
import { evaluations, games, type Game } from "../db/schema";
import { TIME_CONTROL_CATEGORIES, type TimeControlCategory } from "../platform";
import { bucket, type Bucket } from "../results/win-rate";
import {
  phaseDamageTable,
  phaseResultTable,
  type GameDamage,
  type PhaseDamageTable,
  type PhaseEnding,
  type PhaseResultTable,
} from "./phase-tables";
import {
  signatureTable,
  type Crossing,
  type EndgameCrossing,
  type SignatureTable,
} from "./signatures";

/** History-wide results summary (see PRD / CONTEXT.md `Win rate`). */
export interface StatsSummary {
  total: Bucket;
  byCategory: Record<TimeControlCategory, Bucket>;
  bySide: Record<"white" | "black", Bucket>;
  /**
   * The corpus table of `Material signature`s (ADR-0036) — the **second** scale,
   * in its own currency. Deliberately not folded into the three buckets above:
   * a Game sits on as many rows as it crossed configurations, so these rows do
   * not add up to `total` and never should.
   */
  signatures: SignatureTable;
  /**
   * **Where the Games are decided** — one row per `Phase`, in results, over the
   * whole history (US-32). It reads the same PGN replay as `signatures`, and
   * that sharing is a design constraint rather than a nicety: `/stats` is
   * already 9.8 s cold on a 186-Game `Profile` and 68 s on the 1 806-Game one,
   * and a second replay would double both.
   */
  phaseResults: PhaseResultTable;
  /**
   * **Where the damage falls** — the same axis, the other currency, over the
   * **analysed** Games only (ADR-0036's amendment). Two tables and never one:
   * on the requester's base they do not designate the same `Phase`, and that
   * disagreement is the information.
   *
   * Free of engine time: it reads stored `Evaluation`s through the very recap
   * the Game page shows (ADR-0017), so no column and no migration (ADR-0015).
   */
  phaseDamage: PhaseDamageTable;
}

/**
 * Which Endgame configurations one Game crossed, **remembered for the life of
 * the process**.
 *
 * The derivation itself is free (ADR-0009); its *input* is not. Only 78 of the
 * base's 2 438 Games are analysed, so the FENs `evaluations` stores (ADR-0012)
 * cover almost none of this table and the rest must be replayed from the PGN —
 * measured at **25 ms per Game**, i.e. 46 s over the largest `Profile` of the
 * base. That is the very cost ADR-0012 removed from `/danger` by storing the
 * FEN, and no column may be added here (US-32: no schema change, no migration).
 *
 * So the replay is paid **once per Game per process** instead of once per view.
 *
 * **Keying on the Game's id is sound because a PGN does not change within a
 * process** — which is a weaker claim than "a PGN is immutable", and the weaker
 * one is the true one: `repair/refresh-clocks.ts` *does* rewrite `games.pgn` in
 * place. It runs as its own CLI (`repair:clocks`), so no `Db` object of the
 * server outlives it. Anyone adding an **in-process** PGN rewrite owes this map
 * an eviction; that is the invariant, not immutability.
 *
 * The map hangs off the `Db` so two databases — every test opens its own
 * `:memory:` one — never see each other's Games. Ids are never reused
 * (`autoIncrement`), so a deleted Game cannot inherit another's crossings.
 *
 * What it does **not** fix is the first view, which still pays the whole replay
 * — 7.9 s on a 186-Game `Profile`, 48.8 s on the 1 806-Game one, measured
 * through the browser on 2026-09-25. The screen announces that wait
 * (`role="status"`); what the wait must not do is **take the whole server with
 * it**, which is why `crossingsOf` yields (below). Removing the wait itself
 * needs the Positions of an unanalysed Game to be stored — a schema change and
 * a migration, so a ticket of its own, named rather than smuggled in here.
 */
const crossedByGame = new WeakMap<Db, Map<number, Crossing>>();

function crossedOf(db: Db, game: Game): Crossing {
  let remembered = crossedByGame.get(db);
  if (!remembered) crossedByGame.set(db, (remembered = new Map()));

  const known = remembered.get(game.id);
  if (known) return known;

  const crossed = replayed(game);
  remembered.set(game.id, crossed);
  return crossed;
}

/**
 * A PGN that cannot be replayed costs this Game its row, not the whole table —
 * the same refusal `import/range.ts` makes, one Game never failing the batch.
 *
 * But it is **said**, not folded into "never reaches the Endgame": the table's
 * whole discipline is that nothing is erased and no absence is printed as a
 * fact, and "your Game has no Endgame" is a statement about the Player's chess
 * where "we could not read it" is a statement about us.
 */
function replayed(game: Game): Crossing {
  try {
    const fens = gamePositions(game.pgn);
    // ONE reading of the Phases, two tables. `crossedSignatures` would derive
    // them again on its own, and `/stats` also needs the last one for its
    // results-by-Phase table — so they are derived here and handed down. The
    // replay itself is the expensive half; paying `phases()` twice over the
    // same FENs on top of it would be waste with nothing to show for it.
    const phaseOf = phases(fens);
    return {
      signatures: crossedSignatures(fens, game.playerColor, phaseOf),
      // The Phase the Game ENDED in: the last Position's, which is the Position
      // the result was recorded on. Never undefined — `gamePositions` yields at
      // least the initial Position, even for a Game with no move at all.
      endedIn: phaseOf[phaseOf.length - 1],
    };
  } catch {
    return { signatures: [], unreadable: true };
  }
}

/**
 * How many Games are folded between two turns of the event loop.
 *
 * The fold blocks while it runs, and it runs for tens of seconds on a large
 * `Profile` — 48.8 s on the 1 806-Game one, measured. Without a yield that is
 * not a slow page, it is **the whole server answering nothing**: ADR-0012
 * removed exactly this from `/danger`, and re-introducing it one route over
 * would be the same defect wearing this feature's name. Yielding does not make
 * the wait shorter; it makes it **one screen's wait** instead of everyone's.
 *
 * Twenty-five is ~0.6 s of replay between turns at the measured 25 ms per Game.
 */
const YIELD_EVERY = 25;

/** Hands the event loop back, so a long fold is not a stalled server. */
const breathe = () => new Promise<void>((resume) => setImmediate(resume));

async function crossingsOf(db: Db, rows: Game[]): Promise<EndgameCrossing[]> {
  const crossings: EndgameCrossing[] = [];
  for (const [i, row] of rows.entries()) {
    if (i > 0 && i % YIELD_EVERY === 0) await breathe();
    crossings.push({ result: row.result, ...crossedOf(db, row) });
  }
  return crossings;
}

/**
 * Aggregates **one `Profile`'s** Games on the fly into that player's summary
 * (ADR-0014). The `Win rate` this returns is one player's win rate; averaging
 * two histories into it would produce a figure that is nobody's.
 */
export async function getStats(db: Db, profileId: number): Promise<StatsSummary> {
  const rows = db.select().from(games).where(eq(games.profileId, profileId)).all();
  const crossings = await crossingsOf(db, rows);
  return {
    total: bucket(rows),
    byCategory: Object.fromEntries(
      TIME_CONTROL_CATEGORIES.map((c) => [c, bucket(rows.filter((r) => r.timeControlCategory === c))]),
    ) as Record<TimeControlCategory, Bucket>,
    bySide: {
      white: bucket(rows.filter((r) => r.playerColor === "white")),
      black: bucket(rows.filter((r) => r.playerColor === "black")),
    },
    signatures: signatureTable(crossings),
    phaseResults: phaseResultTable(
      crossings.map((c): PhaseEnding => ({ phase: c.endedIn ?? null, result: c.result })),
    ),
    phaseDamage: phaseDamageTable(await damageOf(db, rows), rows.length),
  };
}

/**
 * What one analysed Game lost by `Phase`, **remembered for the life of the
 * process** — the same bargain `crossedByGame` strikes one fold up, for the same
 * reason and at the same altitude.
 *
 * It is needed because table B is **not free**, and measuring said so: the
 * recap of one Game costs ~250 ms — `countedMoves` and `chancesLostByMove` both
 * walk the Positions through a board to tell a forced Move from a chosen one —
 * so the 66 analysed Games of the requester's largest analysed `Profile` add
 * **14 s** to a page that already waited 14 s for its PGN replay. Fine on a
 * Game's own page, where it is paid once for one Game; not fine folded over a
 * corpus on every visit.
 *
 * **Keyed on more than the Game's id**, unlike the replay above, and that
 * difference is the whole design: a PGN does not change within a process, but
 * `evaluations` rows very much do — the `Analysis pass` writes them, in this
 * same process. So the stamp is the shape of what was read: how many rows, and
 * which pass wrote the last of them. A re-analysis changes one or the other and
 * the memo misses, which is what it should do. Cheap, because the rows have
 * already been fetched by the time it is computed — the query is 11 ms over the
 * 66 Games; it is the derivation that costs.
 */
const damageByGame = new WeakMap<Db, Map<number, { stamp: string; damage: GameDamage }>>();

/** One analysed Game's damage, from the memo when the stored rows are unchanged. */
function damageOfGame(db: Db, game: Game, evals: AnalysedRow[]): GameDamage {
  let remembered = damageByGame.get(db);
  if (!remembered) damageByGame.set(db, (remembered = new Map()));

  // Order-INDEPENDENT on purpose: the query below has no `ORDER BY`, so "the
  // last row" is whatever SQLite happened to hand back. A stamp built on it
  // would miss a re-analysis that kept the row count and moved a pass that is
  // not last — the one case the stamp exists for.
  const stamp = `${evals.length}:${Math.max(0, ...evals.map((row) => row.passId ?? 0))}`;
  const known = remembered.get(game.id);
  if (known && known.stamp === stamp) return known.damage;

  const recap = gameRecap(game, evals, null);
  const damage: GameDamage = {
    byPhase: Object.fromEntries(
      PHASES.map((phase) => [phase, recap.byPhase[phase]?.chancesLost ?? null]),
    ) as Record<Phase, number | null>,
    chancesLost: recap.chancesLost,
  };
  remembered.set(game.id, { stamp, damage });
  return damage;
}

/** A stored `Evaluation` as this fold reads it: what `gameRecap` needs, plus the
 *  pass that wrote it, which is half the memo's stamp above. */
type AnalysedRow = {
  ply: number;
  fen: string;
  cp: number | null;
  mate: number | null;
  pv: string;
  passId: number | null;
};

/**
 * What the **analysed** Games of a `Profile` lost, by `Phase` — the input of
 * table B, read through `gameRecap` and nothing else.
 *
 * Going through the recap is the point, not a convenience: ADR-0017 makes the
 * corpus the sum of per-Game recaps, so a corpus reading that re-derived the
 * bands from the rows would be a **second implementation** of the method — and
 * two implementations agree by luck and diverge in silence. The Game page and
 * this table therefore print the same split, by construction. It is also what
 * makes the cost above unavoidable rather than a choice: the cheap reading is
 * the one that would be wrong.
 *
 * No engine time, no column, no migration (ADR-0015): it reads `evaluations`
 * rows that already exist. And no PGN replay either — the FENs come from the
 * rows themselves (ADR-0012).
 *
 * The `Search regime` is not read: it labels the figures on a Game's own page
 * and says nothing about where the damage fell.
 */
async function damageOf(db: Db, rows: Game[]): Promise<GameDamage[]> {
  const analysed = rows.filter((row) => row.analyzed);
  if (analysed.length === 0) return [];

  // One query rather than one per Game: the fold is dear enough without adding
  // a round trip per Game to it.
  const byGame = new Map<number, AnalysedRow[]>();
  for (const row of db
    .select({
      gameId: evaluations.gameId,
      ply: evaluations.ply,
      fen: evaluations.fen,
      cp: evaluations.cp,
      mate: evaluations.mate,
      pv: evaluations.pv,
      passId: evaluations.passId,
    })
    .from(evaluations)
    .where(
      inArray(
        evaluations.gameId,
        analysed.map((game) => game.id),
      ),
    )
    .all()) {
    const held = byGame.get(row.gameId);
    if (held) held.push(row);
    else byGame.set(row.gameId, [row]);
  }

  const readings: GameDamage[] = [];
  for (const [i, game] of analysed.entries()) {
    // Same courtesy as the replay above, and needed for the same reason: a
    // ~250 ms recap per Game is a long fold, and a long fold that never yields
    // is a server that answers nothing rather than a page that is slow.
    if (i > 0 && i % YIELD_EVERY === 0) await breathe();
    readings.push(damageOfGame(db, game, byGame.get(game.id) ?? []));
  }
  return readings;
}
