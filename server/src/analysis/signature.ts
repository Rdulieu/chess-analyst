/**
 * The **`Material signature`** of one Position (CONTEXT.md, ADR-0036): which
 * majors and minors each side still has, the `Player`'s set against their
 * opponent's — `RRB vs RRN`, `RR vs Q`, `R vs —`.
 *
 * **It is not a number, and that is the whole decision.** Two rooks against a
 * queen is `+1` on any points scale and close to nothing on the engine's, while
 * being an entirely different Game to play: the scalar that would have been
 * promoted here (`material` in `signals.ts`, US-44) says "level" about the very
 * configuration that took 81 % of Game 715's counted damage. A signature names
 * an imbalance **of nature**, and says nothing else.
 *
 * **Derived, never stored** (ADR-0009): read off the FEN the `Analysis pass`
 * already writes, so no column and no migration are owed (ADR-0015).
 *
 * It is a property of the **half-move**, never of the Game — an imbalance is
 * born mid-Game, and `RR vs Q` occurs in **0** Games of the base as a boundary
 * snapshot against **9** when every half-move carries its own (ADR-0036).
 * Reading it on `Endgame` half-moves only is a **scope** decision taken at the
 * grill, not a property of the term: nothing here knows about a `Phase`.
 */

/** The only men that count. Kings are not material and pawns are not an
 *  imbalance of nature — a pawn up is exactly what a scalar says well. */
const CANONICAL = ["q", "r", "b", "n"] as const;

/** An empty side, said rather than left blank: `R vs —` is a configuration, and
 *  a missing half of the string would read as a truncation. */
const NOTHING = "—";

/** One side's men, in the canonical `Q R B N` order — so one configuration has
 *  one writing and one only, and the string can serve as a bucket key. */
function side(men: string[]): string {
  const written = CANONICAL.flatMap((piece) =>
    men.filter((man) => man === piece).map(() => piece.toUpperCase()),
  ).join("");
  return written === "" ? NOTHING : written;
}

/**
 * The `Material signature` of a FEN, from the `Player`'s point of view: their
 * own men first, the opponent's after. Only the placement field is read.
 */
export function signature(fen: string, playerColor: "white" | "black"): string {
  const placement = fen.split(" ")[0];
  const white: string[] = [];
  const black: string[] = [];
  for (const symbol of placement) {
    const piece = symbol.toLowerCase();
    if (!CANONICAL.includes(piece as (typeof CANONICAL)[number])) continue;
    (symbol === symbol.toUpperCase() ? white : black).push(piece);
  }
  const [mine, theirs] = playerColor === "white" ? [white, black] : [black, white];
  return `${side(mine)} vs ${side(theirs)}`;
}
