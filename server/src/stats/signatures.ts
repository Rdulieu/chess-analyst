import { materialDelta } from "../analysis/material-delta";
import type { Phase } from "../analysis/phase";
import { bucket, type Bucket } from "../results/win-rate";

/**
 * How many Games a configuration needs before it gets a row of its own.
 *
 * **Three**, by the requester's decision (ADR-0036): 461 rows rather than 56 at
 * thirty, because seeing much and judging for oneself beats seeing only the very
 * solid. The guard-rail is therefore **not** this threshold — it is the visible
 * denominator on every row: at n = 3 a rate is worth ±29 points, and alone it
 * would lie.
 */
export const SIGNATURE_THRESHOLD = 3;

/**
 * What one Game crossed: the SET of its Endgame `Material signature`s — empty
 * when no Endgame was reached — and whether we failed to read it at all.
 *
 * The two empties are **not** the same statement and are never merged: "this
 * Game has no Endgame" is a fact about the Player's chess, "we could not replay
 * this PGN" is a fact about us. Printing the second as the first is the false
 * zero the whole block exists to refuse.
 */
export interface Crossing {
  signatures: string[];
  /**
   * The `Phase` the Game **ended** in — the last Position's, and the axis of the
   * results table beside this one (US-32). It rides on the same object because
   * it comes from the same replay: reading it separately would mean walking
   * every PGN twice, and `/stats` is already the slowest page of the app.
   *
   * `undefined` exactly when `unreadable` is true, and only then.
   */
  endedIn?: Phase;
  unreadable?: boolean;
}

/** One Game's contribution: its result, and what it crossed. */
export interface EndgameCrossing extends Crossing {
  result: "win" | "draw" | "loss";
}

/** One configuration's line: its writing, and the results over the Games that crossed it. */
export interface SignatureRow extends Bucket {
  signature: string;
  /**
   * The material disagreement of that configuration, in points, signed — the
   * scalar ADR-0036 refuses as an identity, carried here as a **column**.
   *
   * It is not the key of the row (the signature is), it takes no part in the
   * order (frequency does), and it merges nothing: two configurations at the
   * same delta stay two rows, because they are two different games of chess.
   * `RR vs Q` reads `+1` here, which is the ADR's own argument shown rather
   * than corrected.
   */
  delta: number;
}

/**
 * The corpus table of `/stats`: **in which Endgame configurations the Player
 * plays, and how they fare there.**
 *
 * **The currency is the Game's result**, never chances lost — the second scale
 * of ADR-0036, and the one place the two must not be folded. Chances lost are
 * solid *within* a Game and hollow across a corpus; a result is the reverse. So
 * this is a **second object**, not the fold of ADR-0017: a result rate is not
 * the sum of per-Game recaps and is never to be presented as one.
 */
export interface SignatureTable {
  /** The bar a configuration must clear to get a row — stated, not implied. */
  threshold: number;
  /** The configurations at or above the bar, **most played first**. */
  rows: SignatureRow[];
  /** What stayed under the bar: counted and named, never erased. */
  below: { configurations: number };
  /**
   * What the table is about, so it is never read as the whole history: the
   * Games it looked at, those that reached an Endgame, those that never do —
   * and those whose PGN could not be replayed, counted apart rather than filed
   * under "no Endgame", which would be our failure told as the Player's chess.
   */
  scope: { games: number; withEndgame: number; withoutEndgame: number; unreadable: number };
}

/**
 * Folds one `Profile`'s Games into the table. A Game counts **once per
 * configuration it crossed**, so it appears on several rows and the rows do not
 * sum to the history — which is exactly why the table states its scope.
 */
export function signatureTable(crossings: EndgameCrossing[]): SignatureTable {
  const bySignature = new Map<string, EndgameCrossing[]>();
  for (const crossing of crossings) {
    for (const key of crossing.signatures) {
      const held = bySignature.get(key);
      if (held) held.push(crossing);
      else bySignature.set(key, [crossing]);
    }
  }

  const all = [...bySignature].map(([signature, played]) => ({
    signature,
    delta: materialDelta(signature),
    ...bucket(played),
  }));
  const rows = all.filter((row) => row.games >= SIGNATURE_THRESHOLD).sort(mostPlayedFirst);

  return {
    threshold: SIGNATURE_THRESHOLD,
    rows,
    below: { configurations: all.length - rows.length },
    scope: {
      games: crossings.length,
      withEndgame: crossings.filter((c) => c.signatures.length > 0).length,
      withoutEndgame: crossings.filter((c) => c.signatures.length === 0 && !c.unreadable).length,
      unreadable: crossings.filter((c) => c.unreadable === true).length,
    },
  };
}

/**
 * What the Player meets most comes first: **by frequency**, on the requester's
 * decision (2026-09-25), and hundreds of rows in alphabetical order are a corpus
 * to wade through rather than a reading.
 *
 * It replaces "defeats first", and the change is a change of *question*. Defeats
 * first answered "where do I lose?", and put a configuration seen three times and
 * lost three times above the terrain of a hundred Games. Frequency answers "what
 * do I actually play?" — the denominator the Player lives on, which is also the
 * one where an improvement pays off most often. The loss count is still on every
 * row, so the first question remains readable; it is no longer the one the order
 * asks.
 *
 * Ties break on defeats — at equal frequency the costlier terrain comes up first —
 * and then on the signature itself, so the order is total and the table never
 * reshuffles between two identical loads.
 */
function mostPlayedFirst(a: SignatureRow, b: SignatureRow): number {
  return b.games - a.games || b.loss - a.loss || a.signature.localeCompare(b.signature);
}
