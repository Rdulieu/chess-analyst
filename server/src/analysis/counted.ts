import { Chess } from "cm-chess";
import type { Game } from "../db/schema";
import type { Ply } from "./derivation";

/**
 * The winning-chances **level** under which a Position is held to be already
 * decided, so that a Move played there says nothing about the Player
 * (CONTEXT.md, `Counted Move`). A level, not a drop — which is why it lives
 * here, beside the denominator it defines, and not beside the severity bands.
 *
 * **10 is empirical, and its counterpart is counted.** It was once a corollary:
 * flagging asked for a 10% drop, so it asked for 10% left to lose, and nothing
 * under the floor could be flagged. That derivation went the moment the two
 * numbers parted — the band is 5 now, and a Move played at 5.8% of chances can
 * drop 5.5 and be flagged while excluded. What justifies 10 now is the measurement — on the twenty-Game
 * reference corpus the dead zone holds **81** of the Player's Moves, against
 * which at most a handful can be flagged while excluded. The floor buys a
 * denominator that stays comparable between Games, at a price that is stated
 * rather than assumed away.
 *
 * Deliberately **asymmetric**: a band around equality would also drop Moves
 * played while winning, deleting *failure to convert* from the vocabulary.
 */
export const DECIDED_FLOOR = 10;

/**
 * Why one of the Player's Moves does not count. **Two reasons, named apart
 * everywhere** and never melted into a single "not counted": they say different
 * things, and a Player who cannot tell them apart can audit neither.
 */
export type UncountedReason = "forced" | "decided";

/** Whether one of the Player's Moves counts, and when it does not, why. */
export interface MoveCount {
  counted: boolean;
  reason: UncountedReason | null;
}

/**
 * Which of the Player's Moves the analysis **counts** (CONTEXT.md `Counted
 * Move`) — the denominator of everything this tool concludes, hence the thing
 * that has to be auditable Move by Move.
 *
 * Index-aligned with `plies`: entry `i` is about the Move that led to ply `i`.
 * `null` for ply 0 and for the **opponent's** Moves — not `counted: false`,
 * because nothing at all is derived for them: the denominator is a statement
 * about the Player's play, and saying "not counted" about the opponent would
 * invite the reading that it might have been.
 *
 * Neither reason costs an engine call. **Forced** is a rule of chess, read off
 * the Position already stored with the `Evaluation`; **already decided** is
 * `DECIDED_FLOOR`, which CONTEXT.md publishes — no new threshold is introduced
 * here.
 */
export function countedMoves(plies: Ply[], playerColor: Game["playerColor"]): (MoveCount | null)[] {
  return plies.map((_, i) => {
    if (i === 0) return null;
    const mover = (i - 1) % 2 === 0 ? "white" : "black";
    if (mover !== playerColor) return null;
    return classify(plies[i - 1]);
  });
}

/**
 * One of the Player's Moves, judged from the Position it was played **from**.
 * Its `winChances` need no flipping: the Player is the one to move there, so
 * they are already the Player's own.
 *
 * **Forced wins over decided** when both hold: "there was nothing to choose" is
 * the stronger statement, and it is true whatever the evaluation said.
 */
function classify(before: Ply): MoveCount {
  if (isForced(before.fen)) return { counted: false, reason: "forced" };
  // Strictly **under** the floor: the floor itself is still a Position with
  // something left to lose, so a Move played there is still the Player's to own.
  if (before.winChances < DECIDED_FLOOR) return { counted: false, reason: "decided" };
  return { counted: true, reason: null };
}

/**
 * What each of the Player's Moves **cost them**, in winning-chances points —
 * the per-Move figure ADR-0017 says a Game carries, and the one the recap sums.
 *
 * `null` where nothing is contributed at all (ply 0, and the opponent's Moves);
 * `0` for a Move that does not count, since an excluded Move contributes no loss
 * by definition. Summing the non-null entries **is** the recap's `chancesLost`:
 * one implementation, read by the page and by the aggregate, rather than two
 * that agree by luck.
 */
export function chancesLostByMove(
  plies: Ply[],
  playerColor: Game["playerColor"],
): (number | null)[] {
  const counted = countedMoves(plies, playerColor);

  return plies.map((_, i) => {
    const move = counted[i];
    if (move === null) return null;
    if (!move.counted) return 0;
    // The Position's chances are relative to whoever is to move there: the Player
    // before their own Move, the opponent after it — hence the flip. Only losses:
    // a Move that gained is not a negative loss to net off against another's.
    return Math.max(0, plies[i - 1].winChances - (100 - plies[i].winChances));
  });
}

/**
 * Whether the Position left exactly one legal Move. Playing the only Move there
 * is earns neither credit nor blame, and those Moves do nothing but **inflate
 * the denominator** — their share varies with the moment of the Game, so keeping
 * them would stop the rates being comparable between Games.
 */
function isForced(fen: string): boolean {
  return new Chess({ fen }).moves().length === 1;
}
