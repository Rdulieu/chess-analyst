/**
 * The **`Phase`** of each Position of a Game (CONTEXT.md): how far the Game has
 * got — Early game, Middlegame or Endgame.
 *
 * **Derived, never stored** (ADR-0009): it is computed from the FEN the
 * `Analysis pass` already writes with every `Evaluation`, so the rule below can
 * change without spending a second of engine time.
 *
 * **The rule is lichess's own** — `Divider.scala` of `lichess-org/scalachess`,
 * reimplemented here and applied to **every** `Platform` (ADR-0035). It replaced
 * our own "development complete, or the 15th move, whichever comes first",
 * which agreed with theirs on **2.2 %** of the 415 Games of the base carrying a
 * `Lichess division` and whose boundary came from the move cap **74.1 %** of the
 * time: our documented criterion was the minority rule, and "Early game" meant
 * "the first fifteen moves" three times out of four.
 *
 * What is lost with it is **explainability**, and that is the accepted trade:
 * "development is complete" could be said to the Player, "the sum of 49
 * overlapping 2x2 windows is above 150" cannot. The Endgame boundary, on the
 * other hand, stays a piece count anyone can check by eye.
 *
 * The `Lichess division` column is still stored and is still read **nowhere** as
 * a `Phase` (ADR-0031). It has simply stopped discriminating: our derivation
 * being theirs, it agrees by construction, and the test that replays it checks a
 * copy of this file.
 */
export type Phase = "early" | "middlegame" | "endgame";

/**
 * The three `Phase`s **in the Game's own order** — the one place that order is
 * written server-side, so two folds cannot list them differently and a reader
 * never has to check a local literal against this one. Its counterpart on the
 * client (`client/src/chess/phase.ts`) holds the same order and the labels.
 */
export const PHASES: Phase[] = ["early", "middlegame", "endgame"];

/** Majors + minors, both sides combined, at or below which the Middlegame begins. */
const MIDDLEGAME_PIECES = 10;

/** Majors + minors, both sides combined, at or below which the Endgame begins. */
const ENDGAME_PIECES = 6;

/** How many men a side's back rank must be down to for it to read as developed. */
const SPARSE_BACKRANK = 4;

/** The mixedness above which two armies count as interlocked. */
const MIXEDNESS = 150;

/**
 * The `Phase` of every Position of a Game, index-aligned with the FENs given
 * (ply 0 = the starting Position).
 *
 * **It latches**, because both boundaries are the *first* Position that
 * satisfies them and nothing after can take them back. A promotion is the one
 * thing that *adds* material, and without latching it would flip a Game out of
 * the Endgame and straight back into it. So a Phase is a property of the Game's
 * **advancement**, not a verdict on a Position in isolation — two identical
 * Positions reached in two Games can be in different Phases, and that is
 * correct.
 *
 * **A Game can have no Middlegame at all** — 98 of the 2 438 Games of the base,
 * median 17 half-moves. That is lichess's `middle: None` reproduced, not a hole
 * to fill: a Game finished inside the opening never had one. The same answer
 * covers the Game whose two boundaries fall on the same Position, where a
 * Middlegame of length zero would be a fiction.
 */
export function phases(fens: string[]): Phase[] {
  const boards = fens.map(squares);

  const middle = boards.findIndex(startIsOver);
  // Searched only once the start is over, as `Divider.scala` does. It changes
  // nothing — six or fewer pieces is also ten or fewer, so the Endgame can never
  // come first — but the two are kept in the same order as the original.
  const end = middle === -1 ? -1 : boards.findIndex((board) => majorsAndMinors(board) <= ENDGAME_PIECES);
  const middleStart = middle !== -1 && (end === -1 || middle < end) ? middle : -1;

  return boards.map((_, ply) => {
    if (end !== -1 && ply >= end) return "endgame";
    if (middleStart !== -1 && ply >= middleStart) return "middlegame";
    return "early";
  });
}

/** A Position's men by square, `board[rank - 1][file]` with file 0 = the a-file. */
type Board = (string | undefined)[][];

/**
 * Whether the Early game is over on this Position: **any one** of the three
 * criteria is enough. They read the same event from three angles — pieces
 * traded, pieces developed off the back rank, and armies interlocked where
 * nothing has been traded or left home yet.
 *
 * `mixedness` is the one that earns its keep: it is the **only** criterion that
 * decides the boundary in 152 of the 415 measured Games (36.6 %), and without it
 * the boundary runs as late as ply 41 (ADR-0035).
 */
function startIsOver(board: Board): boolean {
  return (
    majorsAndMinors(board) <= MIDDLEGAME_PIECES ||
    backrankSparse(board) ||
    mixedness(board) > MIXEDNESS
  );
}

/** Majors and minors on the board, both sides: neither kings nor pawns count. */
function majorsAndMinors(board: Board): number {
  return board.flat().filter((piece) => piece !== undefined && /[qrbn]/i.test(piece)).length;
}

/**
 * Whether either side's home rank has been emptied below four men — pieces
 * developed, in the form the board makes cheap to read. Every man of that colour
 * counts, king and pawns included: it is an occupancy, not a piece census.
 */
function backrankSparse(board: Board): boolean {
  const white = board[0].filter((piece) => piece !== undefined && piece === piece.toUpperCase());
  const black = board[7].filter((piece) => piece !== undefined && piece === piece.toLowerCase());
  return white.length < SPARSE_BACKRANK || black.length < SPARSE_BACKRANK;
}

/**
 * How interlocked the two armies are: the **49 overlapping 2x2 windows** of the
 * board, each scored by how many men of each colour it holds and how far up the
 * board it sits, summed.
 *
 * The starting Position scores **exactly 0** — every window there is a
 * single-colour block sitting on its own home band, and the table below sends
 * all of those to nothing. That zero is the anchor of the transcription: it is
 * the cheapest thing to check and the first to break if a rank index slips.
 */
function mixedness(board: Board): number {
  let total = 0;
  // `rank` is the 1-based rank of the window's LOWER row, 1..7, and it is what
  // the score is weighted by — the same band that makes a home-row cluster
  // worthless and the same cluster on the seventh rank worth a lot.
  for (let rank = 1; rank <= 7; rank += 1) {
    for (let file = 0; file <= 6; file += 1) {
      let white = 0;
      let black = 0;
      for (const dr of [0, 1]) {
        for (const df of [0, 1]) {
          const piece = board[rank - 1 + dr][file + df];
          if (piece === undefined) continue;
          if (piece === piece.toUpperCase()) white += 1;
          else black += 1;
        }
      }
      total += score(white, black, rank);
    }
  }
  return total;
}

/**
 * One window's contribution, transcribed case for case from `Divider.scala`.
 *
 * Read it as a table, not as arithmetic: nothing here is derivable from
 * anything else, and rewriting it into a formula would be inventing a rule
 * lichess never wrote. The zeroes are the interesting part — a block of one
 * colour on its own side of the board is an army that has not moved.
 */
function score(white: number, black: number, rank: number): number {
  switch (`${white}${black}`) {
    case "00":
      return 0;
    case "10":
      return 1 + (8 - rank);
    case "20":
      return rank > 2 ? 2 + (rank - 2) : 0;
    case "30":
      return rank > 1 ? 3 + (rank - 1) : 0;
    case "40":
      return rank > 1 ? 3 + (rank - 1) : 0;
    case "01":
      return 1 + rank;
    case "11":
      return 5 + Math.abs(4 - rank);
    case "21":
      return 4 + (rank - 1);
    case "31":
      return 5 + (rank - 1);
    case "02":
      return rank < 6 ? 2 + (6 - rank) : 0;
    case "12":
      return 4 + (7 - rank);
    case "22":
      return 7;
    case "03":
      return rank < 7 ? 3 + (7 - rank) : 0;
    case "13":
      return 5 + (7 - rank);
    case "04":
      return rank < 7 ? 3 + (7 - rank) : 0;
    default:
      return 0;
  }
}

/**
 * A FEN's placement field as a board, rank 1 first — the order the rules above
 * read it in, where the FEN itself is written rank 8 first.
 */
function squares(fen: string): Board {
  const rows = fen.split(" ")[0].split("/");
  return rows.reverse().map((row) => {
    const rank: (string | undefined)[] = [];
    for (const symbol of row) {
      if (/\d/.test(symbol)) rank.push(...Array<undefined>(Number(symbol)).fill(undefined));
      else rank.push(symbol);
    }
    return rank;
  });
}
