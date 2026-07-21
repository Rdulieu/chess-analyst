import type { NewGame } from "../src/db/schema";

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
