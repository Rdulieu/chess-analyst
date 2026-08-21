import { Chess } from "cm-chess";

/**
 * Loads a PGN into a board, **tolerating a Game with no moves**. An aborted Game
 * is one we keep on purpose (CONTEXT.md, US-12): its PGN carries headers, no
 * move, and `*` as the result — and the parser rejects that bare `*` where it
 * expects a move. The tolerance lives here, in the one place every reader of a
 * PGN goes through; the headers are still loaded, so such a Game names its
 * players like any other.
 *
 * Trimmed first: the parser rejects trailing whitespace, and both Platforms
 * serve PGNs with a trailing newline.
 */
function loadGame(pgn: string): Chess {
  const chess = new Chess();
  const text = pgn.trim();
  const lines = text.split("\n");
  const movetext = lines
    .filter((line) => !line.startsWith("["))
    .join(" ")
    .trim();
  const hasNoMove = /^(\*|1-0|0-1|1\/2-1\/2)?$/.test(movetext);
  chess.loadPgn(hasNoMove ? lines.filter((line) => line.startsWith("[")).join("\n") : text);
  return chess;
}

/** A half-move: its standard notation, destination square, and the Position (FEN) it leads to. */
export interface Ply {
  san: string;
  fen: string;
  /** The moving piece's destination square (the king's, for castling) — from the rule engine's move data. */
  to: string;
}

/** A Game's navigable history: the starting Position plus every half-move. */
export interface GameHistory {
  startFen: string;
  plies: Ply[];
}

/**
 * The starting Position (FEN) of a Game given its PGN. For a game played from
 * the standard setup this is the standard start position; cm-chess would
 * return the SetUp FEN for a game that began from a custom position.
 *
 * Throws if the PGN cannot be parsed, so a malformed Game surfaces loudly
 * rather than rendering a silently wrong board.
 */
export function startingPosition(pgn: string): string {
  return parseGame(pgn).startFen;
}

/** The two players a PGN names, `null` for a side it leaves unnamed. */
export interface GamePlayers {
  white: string | null;
  black: string | null;
}

/**
 * The two players a Game's PGN names, from its `[White]` / `[Black]` tags.
 *
 * These tags are the **single source** for player identity on screen (US-10a):
 * both names come from the same payload as the Game itself, so they cannot
 * disagree with the board, and they need neither the stored username (which
 * US-11 replaces) nor a network call. Lichess serves the same tags, so this
 * survives US-12 as well.
 *
 * A missing tag — and PGN's `?` placeholder for an unknown player — yields
 * `null` rather than something to display.
 */
export function gameHeaders(pgn: string): GamePlayers {
  const tags = loadGame(pgn).header();
  const named = (tag: string) => {
    const value = tags[tag]?.trim();
    return value && value !== "?" ? value : null;
  };
  return { white: named("White"), black: named("Black") };
}

/**
 * Parses a Game's PGN into a navigable history. Each ply carries the Position
 * that results from it (cm-chess computes these with its rule engine, so
 * castling, en passant and promotion are handled for us). Throws on an
 * unparseable PGN. An **aborted** Game has no ply and opens on the initial
 * Position — it is a Game we keep on purpose (US-12), so it must also replay.
 */
export function parseGame(pgn: string): GameHistory {
  const chess = loadGame(pgn);
  return {
    startFen: chess.setUpFen(),
    // `to` is typed optional (chess.js also models variants with drop moves), but every
    // played standard-chess move has one.
    plies: chess.history().map((move) => ({ san: move.san, fen: move.fen, to: move.to! })),
  };
}
