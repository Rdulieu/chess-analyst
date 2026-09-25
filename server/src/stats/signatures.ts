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
  unreadable?: boolean;
}

/** One Game's contribution: its result, and what it crossed. */
export interface EndgameCrossing extends Crossing {
  result: "win" | "draw" | "loss";
}

/** One configuration's line: its writing, and the results over the Games that crossed it. */
export interface SignatureRow extends Bucket {
  signature: string;
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
  /** The configurations at or above the bar, costliest first. */
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

  const all = [...bySignature].map(([signature, played]) => ({ signature, ...bucket(played) }));
  const rows = all.filter((row) => row.games >= SIGNATURE_THRESHOLD).sort(costliestFirst);

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
 * What costs comes up: **defeats first**, because that is what the Player asked
 * the table for, and hundreds of rows in alphabetical order are a corpus to
 * wade through rather than a reading.
 *
 * Ties break on how often the configuration is played — the same number of
 * defeats over more Games is the terrain the Player actually lives on — and
 * then on the signature itself, so the order is total and the table never
 * reshuffles between two identical loads.
 */
function costliestFirst(a: SignatureRow, b: SignatureRow): number {
  return b.loss - a.loss || b.games - a.games || a.signature.localeCompare(b.signature);
}
