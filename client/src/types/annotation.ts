/**
 * One half-move's annotation (US-7), as served by `GET /api/games/:id/annotations`:
 * the White-relative `Evaluation`/win-chances for the resulting Position, and —
 * for the Player's own Moves only — the severity that led to it.
 */
export interface MoveAnnotation {
  ply: number;
  whiteEval: { cp: number | null; mate: number | null };
  whiteWinChances: number;
  severity: "inaccuracy" | "mistake" | "blunder" | null;
  /**
   * The `Best line` from **this** Position, in UCI, as the engine printed it —
   * whole (the ~6-ply cap is this client's own display choice, applied where the
   * line is read). One field, two readings: the line at ply `n` is what should
   * have been played there, and the line at ply `n + 1` is how the Move actually
   * played is punished.
   */
  bestLine: string[];
  /**
   * The `Phase` this Move was played in (CONTEXT.md) — **derived** server-side
   * from the Position stored with the `Evaluation`, in the Game's own sequence
   * (it latches). A heuristic, and shown precisely so the Player can disagree
   * with where the boundary fell in a Game of theirs.
   */
  phase: "early" | "middlegame" | "endgame";
  /**
   * Whether this Move counts in the analysis and, when it does not, which of the
   * two reasons applies (CONTEXT.md `Counted Move`). `null` for ply 0 and for the
   * **opponent's** Moves — nothing is derived for them, which is a different
   * claim from "not counted".
   */
  counted: { counted: boolean; reason: "forced" | "decided" | null } | null;
  /**
   * What this Move cost the Player, in winning-chances points (ADR-0017).
   * `null` where nothing is contributed (ply 0, the opponent's Moves), `0` for a
   * Move that does not count. The Game's recap is the **sum** of these, which is
   * what stops the cumulative trace and the total stated beside it disagreeing.
   */
  chancesLost: number | null;
}

/** The `Search regime` a Game was analyzed under (CONTEXT.md): depth and number
 *  of lines. What says how much confidence its figures deserve. */
export interface SearchRegime {
  depth: number;
  lines: number;
}

/**
 * What a Game **contributes** to the analysis (ADR-0017): the aggregate to come
 * is this recap summed, so the page reads the same derivation the corpus will —
 * never a second summary of its own making.
 */
export interface GameRecap {
  playerMoves: number;
  countedMoves: number;
  excluded: { forced: number; decided: number };
  /** Flawed Moves the **Game** shows, counted or not. */
  flaggedMoves: number;
  /** Flawed Moves the **analysis** holds the Player to. */
  countedErrors: number;
  /**
   * The gap between the two above, **by the reason that excluded each Move** —
   * the server's own breakdown, never recomputed here. A lump would let this
   * screen say "shown but not counted" and stop: the two reasons say different
   * things, and the Player has to be able to tell them apart.
   */
  flaggedUncounted: { forced: number; decided: number };
  chancesLost: number;
  flaggedLoss: number;
  /** The residual: `flaggedLoss + drift === chancesLost`, on every Game. */
  drift: number;
  regime: SearchRegime | null;
}

/**
 * The exact clock setting a Game was played under (CONTEXT.md, `Time control`),
 * as the server derives it from the PGN (ADR-0029). Two shapes, because a
 * real-time budget and a correspondence allowance are not the same kind of fact
 * — folding them into one would invite subtracting days from seconds.
 *
 * Centiseconds, like every measured time here: the finest unit the material
 * carries, and an integer that cannot drift over a sum.
 */
export type TimeControl =
  | { kind: "realtime"; initialCs: number; incrementCs: number }
  | { kind: "correspondence"; daysPerMove: number };

/**
 * What a Game says about **time** (US-15b) — served beside the annotations and
 * deliberately outside `recap`, because it is read from the PGN and therefore
 * exists on a Game the engine has never seen. `rapid` has no analysed Game at
 * all, and it is the cadence this story exists for.
 */
export interface GameTime {
  /** The exact clock setting, or `null` when the PGN declares none. */
  timeControl: TimeControl | null;
}

/** `GET /api/games/:id/annotations` response: `plies` is empty when `analyzed` is `false`. */
export interface GameAnnotations {
  analyzed: boolean;
  plies: MoveAnnotation[];
  /** The regime the Game was analyzed under; `null` when unanalyzed or unknown. */
  regime: SearchRegime | null;
  /** What this Game contributes; `null` when it has not been analyzed. */
  recap: GameRecap | null;
  /** What this Game says about time — filled whatever `analyzed` says. */
  time: GameTime;
}
