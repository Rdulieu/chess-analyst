import { loadGame } from "../../chess/positions";
import type { ImportedGame, TimeControlCategory } from "../types";
import { OTHER_OPENING } from "../chesscom/opening";
import type { LichessGame } from "./payload";

/**
 * Lichess's half of ADR-0018: the pure translation from Lichess's game shape
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
 * Whether this game is one we study at all. Lichess answers more kinds of game
 * than chess.com does, and three of them must never become a `Game`
 * (CONTEXT.md) — each for its own reason, none of them a defensive check
 * against something rare:
 *
 * - a **variant**: a game that is not the game is worth nothing to these
 *   aggregates (already true for chess.com);
 * - a game from an **arbitrary position**: normal rules, but every aggregate
 *   here is keyed by FEN or ECO and assumes the initial position. 5% of the
 *   reference account, so this is a real population;
 * - a game **against the computer**: the opponent is not an account, so there is
 *   no name to record, and every aggregate asks a question about play against
 *   people. Decisively, chess.com never exposes these at all, so importing
 *   Lichess's would make two Profiles silently incomparable.
 *
 * An **aborted** game is kept, which is the mirror image of the same principle:
 * both Platforms send them, so keeping them on both is what keeps the corpus the
 * same kind of thing. With no classifiable opening it lands in `Other`.
 *
 * A pace we have no word for is excluded too — storing it would mean picking a
 * category at random, and every per-pace breakdown would carry the guess.
 */
export function isInScope(game: LichessGame): boolean {
  if ((game.variant ?? "standard") !== "standard") return false;
  if (game.initialFen !== undefined) return false;
  if (game.players.white.aiLevel !== undefined || game.players.black.aiLevel !== undefined) {
    return false;
  }
  return pace(game.speed) !== undefined;
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
    lastClockCs: lastClockOf(game),
    // Kept exactly as Lichess gave them, each half independently: a Game that
    // never left the opening has neither, and one that reached a middlegame and
    // no endgame has one. Neither is invented (ADR-0031).
    divisionMiddlePly: game.division?.middle ?? null,
    divisionEndPly: game.division?.end ?? null,
  };
}

/**
 * The one `Clock` reading that belongs to no `Move`, or `null` when there is
 * none.
 *
 * **Decided by comparing lengths, not by trusting the last element.** The
 * `clocks` array holds one entry more than there are half-moves exactly when the
 * Game ended without the side to move playing; on a mate it holds as many, and
 * its last entry is then a `Move`'s own reading, which the PGN already carries.
 * Taking `clocks.at(-1)` unconditionally would give that Move's clock a second
 * meaning (measured 2026-09-08, eight Games, four terminations).
 *
 * A length matching neither contract is answered `null` rather than guessed at:
 * "no last Clock" is honest, and an entry picked because it happened to be last
 * is not.
 */
function lastClockOf(game: LichessGame): number | null {
  const clocks = game.clocks;
  if (clocks === undefined || clocks.length === 0) return null;
  // The half-moves as the PGN records them — the same count the readings are
  // compared against.
  const halfMoves = loadGame(game.pgn ?? "").history().length;
  return clocks.length === halfMoves + 1 ? clocks[clocks.length - 1] : null;
}
