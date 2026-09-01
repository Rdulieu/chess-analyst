/**
 * How a Move is **numbered** and **named** to the Player: its number, the side,
 * and its standard notation — `21.Rd1`, not `21.`.
 *
 * **One home, on purpose.** This lived twice, once per component, and the two
 * copies drifted the moment one of them learned about notations: the same screen
 * then named a Move in one paragraph and numbered it three lines below, which
 * reads as a bug because it is one. Since US-23 (D4) the move list of both
 * screens that draw a board reads from here too, rather than growing a third.
 *
 * The notation is what makes a sentence usable. Two plies of the same Move number
 * render as `21.` and `21…` — nearly the same string for two different Moves —
 * where with notations they are `21.Rd1` and `21…Nxe5`, and the Player can find
 * both on their board.
 *
 * Falls back to the number alone when no notation came through: a poorer
 * sentence, and still a true one. Nothing here is ever load-bearing for a figure.
 */

/** Where a Game's plies start counting from: whose Move ply 1 is, and its number. */
export type StartingPoint = { side: "white" | "black"; number: number };

/** The usual one, and the answer whenever a Position cannot be read. */
const USUAL: StartingPoint = { side: "white", number: 1 };

/**
 * Where a Game starts, read off the Position it was set up from.
 *
 * Almost every Game starts the usual way, but a Game set up from a Position has
 * Black to move at ply 1 and its own Move number — so numbering from 1. as if
 * White had opened would name every Move wrongly. An unreadable Position answers
 * the usual start: a poorer answer, and the true one for the overwhelming case.
 */
export function startingPoint(fen: string): StartingPoint {
  const fields = fen.trim().split(/\s+/);
  const side = fields[1];
  const number = Number(fields[5]);
  if ((side !== "w" && side !== "b") || !Number.isInteger(number) || number < 1) return USUAL;
  return { side: side === "w" ? "white" : "black", number };
}

/**
 * The number of one ply, with the side that tells the two halves of a Move apart.
 *
 * `12.` on White's half and `12…` on Black's — never the whole Move's number on
 * both, which would print `12. Nf3` then `12. Nc6` and the second is false.
 */
export function plyNumber(ply: number, start: StartingPoint = USUAL): string {
  // How many half-moves separate this one from White's half of the first Move:
  // a Game starting on Black's turn is one half-move further along.
  const fromWhitesHalf = ply - 1 + (start.side === "black" ? 1 : 0);
  const number = start.number + Math.floor(fromWhitesHalf / 2);
  return `${number}${fromWhitesHalf % 2 === 0 ? "." : "…"}`;
}

/** How a Move is named: its number, then its notation when one came through. */
export function moveName(
  ply: number,
  notation: string | null = null,
  start: StartingPoint = USUAL,
): string {
  const number = plyNumber(ply, start);
  return notation ? `${number}${notation}` : number;
}
