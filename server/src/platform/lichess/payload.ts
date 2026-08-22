/**
 * The Lichess games-export surface, and **nothing above this directory knows
 * it** (ADR-0016): these shapes stop at the adapter, which translates them into
 * `ImportedGame`.
 */

/** One side of a Lichess game. The account is **nested**, unlike chess.com. */
export interface LichessSide {
  user?: { name?: string };
  /** Set instead of `user` when the side is the computer. */
  aiLevel?: number;
}

/** A game as the ndjson export returns it (the fields we read). */
export interface LichessGame {
  id: string;
  /** Lichess's own pace name — `ultraBullet` included, which we fold. */
  speed: string;
  /** "standard" for the game we study; anything else is a variant. */
  variant?: string;
  /** Present when the game started from an arbitrary position. */
  initialFen?: string;
  /** Start instant, epoch milliseconds — the instant the export filters on. */
  createdAt: number;
  /** Absent on a draw; otherwise the winning colour. */
  winner?: "white" | "black";
  players: { white: LichessSide; black: LichessSide };
  /** Lichess's own classification, structured — no PGN header to parse. */
  opening?: { eco?: string; name?: string };
  pgn?: string;
}
