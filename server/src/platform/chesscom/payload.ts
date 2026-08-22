/**
 * The chess.com public API surface, and **nothing above this directory knows
 * it** (ADR-0016): these shapes stop at the adapter, which translates them into
 * `ImportedGame`.
 */

/** One side (white/black) of a chess.com game. */
export interface ChessComPlayerSide {
  username: string;
  /** Result code: "win", or a loss/draw code ("checkmated", "resigned", "agreed", …). */
  result: string;
}

/** A game as returned by chess.com's monthly-archive endpoint (fields we use). */
export interface ChessComGame {
  url: string;
  pgn: string;
  /** chess.com's own pace classification — the same words we use, minus the new ones. */
  time_class: "bullet" | "blitz" | "rapid" | "daily";
  /** Game variant: "chess" for standard, "chess960" etc. otherwise. */
  rules: string;
  /** Game-end timestamp, seconds since the Unix epoch. */
  end_time: number;
  white: ChessComPlayerSide;
  black: ChessComPlayerSide;
}
