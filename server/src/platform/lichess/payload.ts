/**
 * The Lichess games-export surface, and **nothing above this directory knows
 * it** (ADR-0018): these shapes stop at the adapter, which translates them into
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
  /**
   * Every `Clock` reading of the Game, in **centiseconds**, present only when
   * the export was asked for `clocks=true` (US-15b).
   *
   * **Its length is a contract, and nothing may zip it naively against the
   * Moves.** Measured on eight Games, four terminations (2026-09-08): it holds
   * **one entry more** than there are half-moves whenever the Game ended without
   * the side to move playing — resignation, agreed draw, abandonment — and
   * **exactly as many** on a mate. That surplus entry belongs to no `Move` and
   * appears in no `[%clk]`, which is what makes it the one clock value stored.
   *
   * Absent entirely on a `correspondence` Game: Lichess sends `daysPerTurn` and
   * no clock, which means *not applicable*, never *not fetched*.
   */
  clocks?: number[];
  /**
   * Lichess's own opinion of where the middlegame and endgame begin, present
   * only when the export was asked for `division=true`. Either half may be
   * missing — a Game that never left the opening has neither.
   *
   * Stored as the `Lichess division` and read by NOBODY until US-32 uses it as
   * an outside oracle (ADR-0031). It is never our `Phase`.
   */
  division?: { middle?: number; end?: number };
}
