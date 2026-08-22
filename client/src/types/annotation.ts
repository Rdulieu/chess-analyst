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
}

/** The `Search regime` a Game was analyzed under (CONTEXT.md): depth and number
 *  of lines. What says how much confidence its figures deserve. */
export interface SearchRegime {
  depth: number;
  lines: number;
}

/** `GET /api/games/:id/annotations` response: `plies` is empty when `analyzed` is `false`. */
export interface GameAnnotations {
  analyzed: boolean;
  plies: MoveAnnotation[];
  /** The regime the Game was analyzed under; `null` when unanalyzed or unknown. */
  regime: SearchRegime | null;
}
