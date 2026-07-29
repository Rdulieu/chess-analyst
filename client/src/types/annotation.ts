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
}

/** `GET /api/games/:id/annotations` response: `plies` is empty when `analyzed` is `false`. */
export interface GameAnnotations {
  analyzed: boolean;
  plies: MoveAnnotation[];
}
