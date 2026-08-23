import type { Db } from "../src/db";
import type { NewGame, UnownedGame } from "../src/db/schema";
import { resolveProfile } from "../src/profiles/repository";
import type { ImportedGame, Platform, PlatformClient, PlatformRegistry } from "../src/platform";
import type { ChessComGame } from "../src/platform/chesscom/payload";

let urlSeq = 0;

/**
 * How the fake answers `fetchPlayer`: `true` = known and spelled as typed,
 * `false` = unknown to the Platform, a string = known under THAT canonical
 * spelling, an `Error` = the Platform is unreachable.
 */
export type PlayerAnswer = boolean | string | Error;

/**
 * A chess.com game as the public API returns it, with sensible defaults. Used
 * only by the **adapter's** own tests — nothing above it sees this shape.
 */
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
 * A game as the **port** hands it over (ADR-0018): already in our vocabulary,
 * with sensible defaults. This is what everything above the adapter fakes —
 * a fake answering a chess.com payload would make the import suite know a
 * Platform by name, which is exactly what the port exists to prevent.
 */
export function importedGame(over: Partial<ImportedGame> = {}): ImportedGame {
  return {
    gameUrl: `https://www.chess.com/game/live/${urlSeq++}`,
    pgn: "1. e4 e5",
    opponent: "opp",
    playerColor: "white",
    result: "win",
    date: "2024-01-01",
    timeControlCategory: "blitz",
    eco: "other",
    openingName: "Autre / non classée",
    ...over,
  };
}

/**
 * What a fake month may answer: the games as such, a `MonthFetch` when a test
 * needs `totalFetched` to differ from them, a **function of the username** when
 * the answer is Player-relative (the adapter's job in real life), or an Error.
 */
export type FakeMonth =
  | ImportedGame[]
  | { totalFetched: number; games: ImportedGame[] }
  | ((username: string) => ImportedGame[])
  | Error;

/**
 * A `PlatformClient` stubbed with one month per key `YYYY-MM` — an Import spans
 * a range, so a fake that answers the same games whatever the month cannot tell
 * one month's contribution from another's. A month with no entry answers empty,
 * like a Platform with no archive that month.
 *
 * `totalFetched` mirrors the games given, which is the nominal case; a test
 * about "the Platform returned more than we kept" states it explicitly by
 * passing a `MonthFetch` instead of an array.
 */
export function fakeClient(
  months: Record<string, FakeMonth>,
  player: PlayerAnswer = true,
): PlatformClient {
  return {
    fetchPlayer: async (username) => {
      // An Error stands for the Platform being unreachable — the case a caller
      // must tell apart from "this account does not exist" (US-11).
      if (player instanceof Error) throw player;
      if (player === false) return null;
      // A string is the CANONICAL spelling the Platform answers, whatever casing
      // was asked for; `true` means "known, spelled as typed".
      return { username: typeof player === "string" ? player : username };
    },
    fetchMonth: async (username, year, month) => {
      const raw = months[`${year}-${String(month).padStart(2, "0")}`];
      const entry = typeof raw === "function" ? raw(username) : raw;
      // An Error entry stands for a month the Platform could not answer for
      // (unreachable, 5xx, rate-limited) — the failure an Import must survive.
      if (entry instanceof Error) throw entry;
      if (entry === undefined) return { totalFetched: 0, games: [] };
      if (Array.isArray(entry)) return { totalFetched: entry.length, games: entry };
      return entry;
    },
  };
}

/**
 * The registry `createApp` is wired with: one adapter per Platform (ADR-0018).
 * Tests that only ever import from chess.com name that Platform alone, so a
 * Profile on another one fails loudly rather than silently fetching elsewhere.
 */
export function fakeRegistry(
  months: Record<string, FakeMonth> = {},
  player: PlayerAnswer = true,
): PlatformRegistry {
  return { chesscom: fakeClient(months, player) };
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
export const MORPHY_GAME: UnownedGame = {
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

/**
 * The `Profile` a test's Games belong to — every Game needs one (ADR-0014), and
 * most tests only need *a* Player, not a particular one.
 */
export function seedProfile(
  db: Db,
  username = "DudulSmash",
  platform: Platform = "chesscom",
): number {
  return resolveProfile(db, platform, username).profile.id;
}

/** The Opera Game, filed under a Profile. */
export function morphyGame(profileId: number): NewGame {
  return { ...MORPHY_GAME, profileId };
}
