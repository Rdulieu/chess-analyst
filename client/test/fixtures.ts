import type { Game } from "../src/types";

/**
 * Representative Game test data: Morphy's Opera Game (same PGN the server
 * seeds). Used as the mocked API payload and to exercise PGN parsing. It
 * starts from the standard setup, so its first Position is the standard
 * starting position.
 */
export const OPERA_PGN = [
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
].join("\n");

export const OPERA_GAME: Game = {
  id: 1,
  profileId: 1,
  gameUrl: "https://www.chess.com/game/fixture/opera-1858",
  pgn: OPERA_PGN,
  opponent: "Duke Karl / Count Isouard",
  playerColor: "white",
  result: "win",
  date: "1858-11-02",
  timeControlCategory: "rapid",
  eco: "C41",
  openingName: "Philidor Defense",
  analyzed: false,
};
