/**
 * A `Danger position` entry as served by `GET /api/danger` (CONTEXT.md): a
 * recurring Position (4-field FEN) with how many times the Player has reached
 * it and in what proportion of those reaches a serious error followed.
 */
export interface DangerEntry {
  fen: string;
  reached: number;
  seriousErrors: number;
  proportion: number;
}
