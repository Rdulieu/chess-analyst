import type { ImportedGame, TimeControlCategory } from "../types";
import { OTHER_OPENING } from "../chesscom/opening";
import type { LichessGame } from "./payload";

/**
 * Lichess's half of ADR-0016: the pure translation from Lichess's game shape
 * into the Player-relative `ImportedGame`. No I/O — the densest, most
 * edge-case-prone part of the adapter, isolated here so it can be unit-tested
 * on its own.
 */

/**
 * Lichess's pace vocabulary translated into ours. `ultraBullet` **folds into
 * bullet** — those games are studied rather than dropped — and the other four
 * agree word for word, `classical` included: it is Lichess having it that made
 * the category worth its own value (`CONTEXT.md`).
 */
const PACES: Record<string, TimeControlCategory> = {
  ultraBullet: "bullet",
  bullet: "bullet",
  blitz: "blitz",
  rapid: "rapid",
  classical: "classical",
  correspondence: "correspondence",
};

/** The pace of a Lichess game in our vocabulary, or `undefined` if unknown. */
export function pace(speed: string): TimeControlCategory | undefined {
  return PACES[speed];
}

/** The account's name on one side — **nested**, unlike chess.com's flat field. */
const nameOf = (side: LichessGame["players"]["white"]): string => side.user?.name ?? "";

/**
 * The instant range covering one month, as Lichess's export wants it: epoch
 * milliseconds, at **UTC** month boundaries. The month is our unit and Lichess's
 * is an instant range, so this conversion is where the two meet — and UTC is
 * what keeps a Player's games from shifting across a boundary depending on where
 * the machine happens to sit.
 */
export function monthWindow(year: number, month: number): { since: number; until: number } {
  return {
    since: Date.UTC(year, month - 1, 1),
    // Inclusive upper bound: the last millisecond of the month, not the first of
    // the next — a game created exactly at midnight belongs to one month only.
    until: Date.UTC(year, month, 1) - 1,
  };
}

/**
 * Whether this game is one we study at all. Slice 04 keeps to what the port's
 * nominal path needs: **standard chess**, at a pace we have a word for. The
 * other exclusions (an arbitrary starting position, a game against the computer)
 * are their own slice.
 */
export function isInScope(game: LichessGame): boolean {
  return (game.variant ?? "standard") === "standard" && pace(game.speed) !== undefined;
}

/**
 * Maps a Lichess game to the Player-relative shape. Who the Profile is stays the
 * Import's business (ADR-0014) — the adapter only says what Lichess said, from
 * the Player's point of view.
 */
export function toImportedGame(game: LichessGame, username: string): ImportedGame {
  const isWhite = nameOf(game.players.white).toLowerCase() === username.toLowerCase();
  const playerColor = isWhite ? "white" : "black";
  const opponent = nameOf(isWhite ? game.players.black : game.players.white);
  return {
    gameUrl: `https://lichess.org/${game.id}`,
    pgn: game.pgn ?? "",
    opponent,
    playerColor,
    // Lichess names a winner or nothing at all: nothing is a draw.
    result:
      game.winner === undefined ? "draw" : game.winner === playerColor ? "win" : "loss",
    // Dated by when the game STARTED, because that is what the export filters
    // on: dating by the end would let a month's window fetch a Game and file it
    // under another month, so importing that month alone would silently miss it.
    date: new Date(game.createdAt).toISOString().slice(0, 10),
    // Non-null by construction: `isInScope` is what lets a game reach here.
    timeControlCategory: pace(game.speed) as TimeControlCategory,
    // Lichess's own classification, structured — no PGN header to parse
    // (ADR-0007's amendment: the Platform is the classification authority).
    eco: game.opening?.eco ?? OTHER_OPENING.eco,
    openingName: game.opening?.name ?? OTHER_OPENING.openingName,
  };
}
