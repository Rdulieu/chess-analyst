/**
 * The **`Phase`** of each Position of a Game (CONTEXT.md): how far the Game has
 * got — Early game, Middlegame or Endgame.
 *
 * **Derived, never stored** (ADR-0009, and the PRD says so in as many words): it
 * is computed from the FEN the `Analysis pass` already writes with every
 * `Evaluation`, so the thresholds below can be retuned without spending a second
 * of engine time. That is not a detail — they are **heuristics, not facts**, and
 * the whole reason the boundaries are shown to the Player is so they can look at
 * a real Game of theirs and disagree.
 *
 * **Two boundaries, two different rules**, and that is the part a single
 * criterion gets wrong: material barely moves before move 15, so it cannot say
 * anything about the first boundary. Development and a clock say when the start
 * is over; only then does material say when the end has begun.
 */
export type Phase = "early" | "middlegame" | "endgame";

/**
 * Which half-move the move cap fires on, and it is a **reading** rather than a
 * setting: `after-white` — the one this app has always used — means White's
 * `MOVE_CAP`-th Move is the first no longer in the Early game; `on-number` is the
 * naive test on the move number alone, which a FEN satisfies half a move earlier,
 * on **Black's** 14th, because the number rises on Black's Move.
 *
 * The alternative exists so the choice can be **measured** on real Games instead
 * of argued (D14 of US-15a-bis): the `Phase` enters no calculation today, and
 * knowing how many Moves the two readings disagree about is what says whether the
 * debate is empty or whether US-15c must not build on this axis yet. It is not a
 * feature and nothing in the app passes it.
 */
export type CapReading = "after-white" | "on-number";

/**
 * The move at which the Early game ends whatever the position looks like — a
 * backstop against a passive Game claiming to still be starting after forty
 * moves, not the usual boundary, which is development.
 *
 * Read as **White's 15th Move is the first one no longer in the Early game**.
 * The distinction is not pedantry: a FEN's move number rises on **Black's** move,
 * so `fullmove >= 15` alone fires on Black's 14th — a half-move early, and
 * visibly so on a real Game (a Player looking at 14...d5 with the king still on
 * e8 would say the opening is not over).
 */
const MOVE_CAP = 15;

/** Majors + minors, both sides combined, at or below which the Endgame begins. */
const ENDGAME_PIECES = 6;

/** Where each side's minors start, by the FEN letter that would still be there. */
const MINOR_HOME: Record<"white" | "black", { square: string; piece: string }[]> = {
  white: [
    { square: "b1", piece: "N" },
    { square: "g1", piece: "N" },
    { square: "c1", piece: "B" },
    { square: "f1", piece: "B" },
  ],
  black: [
    { square: "b8", piece: "n" },
    { square: "g8", piece: "n" },
    { square: "c8", piece: "b" },
    { square: "f8", piece: "b" },
  ],
};

/**
 * The `Phase` of every Position of a Game, index-aligned with the FENs given
 * (ply 0 = the starting Position).
 *
 * **It latches.** A Game that has reached the Endgame stays there, and one that
 * has left the Early game never goes back. A promotion is the one thing that
 * *adds* material, and without latching it would flip a Game out of the Endgame
 * and straight back into it. So a Phase is a property of the Game's
 * **advancement**, not a verdict on a Position in isolation — two identical
 * Positions reached in two Games can be in different Phases, and that is
 * correct.
 */
export function phases(fens: string[], cap: CapReading = "after-white"): Phase[] {
  let reached: Phase = "early";
  return fens.map((fen) => {
    const position = parse(fen);
    if (reached !== "endgame" && pieceCount(position.placement) <= ENDGAME_PIECES) {
      reached = "endgame";
    } else if (reached === "early" && startIsOver(position, cap)) {
      reached = "middlegame";
    }
    return reached;
  });
}

/** The fields of a FEN this derivation reads — placement, castling, move number. */
interface Position {
  placement: string;
  /** Whose Move it is here — what tells White's 15th from Black's 14th. */
  toMove: "w" | "b";
  castling: string;
  fullmove: number;
}

function parse(fen: string): Position {
  const [placement, toMove = "w", castling = "-", , , fullmove = "1"] = fen.split(" ");
  return {
    placement,
    toMove: toMove === "b" ? "b" : "w",
    castling,
    fullmove: Number(fullmove) || 1,
  };
}

/**
 * Whether the Early game is over: development complete for **both** sides, or
 * the move cap — whichever comes first. Both sides, because the Phase is the
 * Game's and not one Player's: a Game where White has castled and Black has not
 * yet moved a piece has not finished starting.
 */
function startIsOver(position: Position, cap: CapReading): boolean {
  if (capReached(position, cap)) return true;
  return (["white", "black"] as const).every((side) => developed(position, side));
}

/**
 * Whether White's `MOVE_CAP`-th Move has been played by the time this Position is
 * reached. A Position after White's Move has **Black** to move on the same move
 * number, which is exactly the half-move the naive `fullmove >= cap` gets wrong.
 */
function capReached(position: Position, cap: CapReading): boolean {
  if (position.fullmove > MOVE_CAP) return true;
  if (position.fullmove !== MOVE_CAP) return false;
  // On the number alone the cap fires as soon as the Position carries it, which
  // is one half-move before White has played their `MOVE_CAP`-th Move.
  return cap === "on-number" || position.toMove === "b";
}

/**
 * One side's development: its four minors off their home squares — a **captured**
 * minor is off its home square too, which is what the rule asks — and its king
 * castled or having lost the right (both read the same way from the FEN: the
 * castling field no longer names it).
 */
function developed(position: Position, side: "white" | "black"): boolean {
  const board = squares(position.placement);
  const minorsOut = MINOR_HOME[side].every((home) => board.get(home.square) !== home.piece);
  const rights = side === "white" ? /[KQ]/ : /[kq]/;
  return minorsOut && !rights.test(position.castling);
}

/** Majors and minors on the board, both sides: neither kings nor pawns count. */
function pieceCount(placement: string): number {
  return (placement.match(/[qrbnQRBN]/g) ?? []).length;
}

/** The placement field as a square → piece map, for the squares that hold one. */
function squares(placement: string): Map<string, string> {
  const board = new Map<string, string>();
  placement.split("/").forEach((row, rank) => {
    let file = 0;
    for (const symbol of row) {
      if (/\d/.test(symbol)) {
        file += Number(symbol);
        continue;
      }
      board.set(`${"abcdefgh"[file]}${8 - rank}`, symbol);
      file += 1;
    }
  });
  return board;
}
