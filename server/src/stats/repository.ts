import { eq } from "drizzle-orm";
import { crossedSignatures } from "../analysis/crossed";
import { gamePositions } from "../chess/positions";
import type { Db } from "../db";
import { games, type Game } from "../db/schema";
import { TIME_CONTROL_CATEGORIES, type TimeControlCategory } from "../platform";
import { bucket, type Bucket } from "../results/win-rate";
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
    return { signatures: crossedSignatures(gamePositions(game.pgn), game.playerColor) };
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
  };
}
