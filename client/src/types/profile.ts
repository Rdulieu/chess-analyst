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
}
