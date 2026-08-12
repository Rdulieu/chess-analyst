import type { NewGame } from "../src/db/schema";
import type { ChessComClient, ChessComGame } from "../src/chesscom";

let urlSeq = 0;

/** A chess.com game as the public API returns it, with sensible defaults. */
export function chessComGame(over: Partial<ChessComGame> = {}): ChessComGame {
  return {
    url: `https://www.chess.com/game/live/${urlSeq++}`,
    pgn: "1. e4 e5",
    time_class: "blitz",
    rules: "chess",
    end_time: 1704067200, // 2024-01-01T00:00:00Z
    white: { username: "me", result: "win" },
    black: { username: "opp", result: "resigned" },
    ...over,
  };
}

/**
 * A ChessComClient stubbed with one archive per month, keyed `YYYY-MM` — an
 * Import now spans a range, so a fake that answers the same games whatever the
 * month cannot tell one month's contribution from another's. A month with no
 * entry answers empty, like chess.com's own 404-for-no-archive.
 */
export function fakeClient(archives: Record<string, ChessComGame[]>, exists = true): ChessComClient {
  return {
    playerExists: async () => exists,
    fetchMonth: async (_username, year, month) =>
      archives[`${year}-${String(month).padStart(2, "0")}`] ?? [],
  };
}

/**
 * Paul Morphy's "Opera Game" (Paris, 1858), kept purely as a **test fixture**
 * now that US-2 removed startup seeding: a short, famous, instantly recognizable
 * game so tests read at a glance. It includes queenside castling (12. O-O-O),
 * exercising special-move handling.
 *
 * `gameUrl`/`playerColor`/`result` are synthetic — this game predates chess.com
 * (and chess clocks): Morphy played White and won, the URL is a placeholder, and
 * "rapid" is an arbitrary valid time control category.
 */
export const MORPHY_GAME: NewGame = {
  gameUrl: "https://www.chess.com/game/fixture/opera-1858",
  pgn: [
    '[Event "Paris Opera"]',
    '[Site "Paris FRA"]',
    '[Date "1858.11.02"]',
    '[White "Paul Morphy"]',
    '[Black "Duke Karl / Count Isouard"]',
    '[Result "1-0"]',
    "",
    "1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6",
    "7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7",
    "12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8",
    "17. Rd8# 1-0",
  ].join("\n"),
  opponent: "Duke Karl / Count Isouard",
  playerColor: "white",
  result: "win",
  date: "1858-11-02",
  timeControlCategory: "rapid",
};
