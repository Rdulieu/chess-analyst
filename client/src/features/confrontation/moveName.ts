/**
 * How a Move is **named** to the Player: its number, the side, and its standard
 * notation — `21.Rd1`, not `21.`.
 *
 * **One home, on purpose.** This lived twice, once per component, and the two
 * copies drifted the moment one of them learned about notations: the same screen
 * then named a Move in one paragraph and numbered it three lines below, which
 * reads as a bug because it is one.
 *
 * The notation is what makes a sentence usable. Two plies of the same Move number
 * render as `21.` and `21…` — nearly the same string for two different Moves —
 * where with notations they are `21.Rd1` and `21…Nxe5`, and the Player can find
 * both on their board.
 *
 * Falls back to the number alone when no notation came through: a poorer
 * sentence, and still a true one. Nothing here is ever load-bearing for a figure.
 */
export function moveName(ply: number, notation: string | null = null): string {
  const number = `${Math.ceil(ply / 2)}${ply % 2 === 1 ? "." : "…"}`;
  return notation ? `${number}${notation}` : number;
}
