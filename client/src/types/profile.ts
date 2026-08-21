/**
 * A `Profile` (CONTEXT.md, ADR-0014): one account on one platform, the pair
 * (`platform`, `username`), and the thing every view will be about. `username`
 * carries the platform's own canonical casing.
 */
export interface Profile {
  id: number;
  platform: "chesscom";
  username: string;
  createdAt: string;
  /** How many Games were imported under this Profile. */
  games: number;
  /** How many of them have been through an `Analysis pass`. */
  analyzed: number;
}
