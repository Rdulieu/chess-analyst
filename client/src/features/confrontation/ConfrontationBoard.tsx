import { Board } from "../../components/Board";
import { markKinds } from "../personal/progress";
import { DECLARED_SEVERITY_SQUARE_TINT } from "../personal/declaredSeverity";
import type { Game, GameAnnotations, PersonalAnalysis } from "../../types";

/**
 * The board on the `Confrontation` route (US-26, ADR-0033).
 *
 * The screen answered "1 sur 4" and left the Player unable to find the other
 * three: nothing on it said *which* Move produced *which* cell. This is the
 * first half of the answer — the Moves are **shown** rather than imagined —
 * and it is held exactly like the board on `Analyse`: same step controls, same
 * keyboard, same move list, same curve, same ribbon.
 *
 * **It composes `Board` directly, not `GameViewer`.** `GameViewer` carries the
 * `Review mode` and the Sans aide of US-28, and neither has any meaning once
 * the seal has fallen: everything is revealed here by definition, so a control
 * offering to hide it again would be offering a setting with nothing behind it.
 *
 * The one thing that differs from `Analyse` is **whose verdict paints the
 * square**: the Player's, never the engine's. A square has neither a column nor
 * a title, only a colour, so it cannot hold two authors — and it is the screen
 * that decides which one it shows (ADR-0022). The engine's own reading is not
 * lost by that choice: it stays in the move list's severity glyph and in the
 * shape of the curve.
 */
export function ConfrontationBoard({
  game,
  annotations,
  reading,
}: {
  game: Game;
  annotations: GameAnnotations;
  /**
   * The Player's sealed reading — **the source of the square's tint**.
   *
   * Read here rather than taken from the `Confrontation` payload because at
   * this slice the payload carries no per-ply verdict: it carries the totals
   * and the matrix. Slice 03 gives it the per-Move list (ADR-0032), and this
   * prop goes with it.
   */
  reading: PersonalAnalysis;
}) {
  return (
    <Board
      pgn={game.pgn}
      // The Player reads their own Game the way they played it (CONTEXT.md →
      // Board orientation).
      orientation={game.playerColor}
      // The engine's side, which is what brings the curve, the winning-chances
      // bar and the Phase ribbon. Not `detailed`: that level adds the Move
      // record and the recap, which belong to `Analyse` and would put a second
      // full reading of the Game on a screen that already has two.
      annotations={annotations.plies}
      // The PLAYER's verdict on the square (ADR-0022). Resolved by `markKinds`,
      // the same function the move list uses — never a second rule, so the
      // square and the glyph three centimetres from it cannot say different
      // things about the same ply.
      squareTint={(ply) => {
        const { verdict } = markKinds(reading.marks, ply);
        return verdict ? DECLARED_SEVERITY_SQUARE_TINT[verdict] : undefined;
      }}
      // The arrows step the Moves — and asking for them is what makes the board
      // announce them, so working and announced cannot come apart (US-23, D6).
      keyboardStepping
    />
  );
}
