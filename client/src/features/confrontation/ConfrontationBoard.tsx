import { useMemo } from "react";
import { Board } from "../../components/Board";
import { markKinds } from "../personal/progress";
import { MoveMarks } from "../personal/MoveMarks";
import { MoveReadout } from "./MoveReadout";
import { readingLabel } from "./readingLabel";
import {
  divergencesOf,
  DIVERGENCE_GLYPH,
  DIVERGENCE_LABEL,
  DIVERGENCE_TINT,
  DIVERGENCE_INK,
  divergenceAt,
} from "./divergence";
import { DECLARED_SEVERITY_SQUARE_TINT } from "../personal/declaredSeverity";
import type { Game, GameAnnotations, MoveReading, PersonalAnalysis } from "../../types";

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
  moves,
  focusRequest,
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
  /** The reading of every Move, as the Confrontation now serves it (ADR-0032). */
  moves: MoveReading[];
  /** A request from elsewhere on the page to bring the board to one ply. */
  focusRequest?: { ply: number; id: number };
}) {
  // By ply, because that is how the board asks: it hands over the index it is
  // standing on, and a linear scan per ply transition would be a lookup written
  // where a map belongs.
  const byPly = useMemo(() => new Map(moves.map((move) => [move.ply, move])), [moves]);
  /**
   * The divergences, and **only** those, for the curve — a handful of marks on
   * sixty plies instead of one per fault. The engine's severities are not put
   * back beside them: the curve already draws the engine's reading by its
   * shape, and a second copy of it would drown the marks that are new.
   */
  const divergences = useMemo(() => divergencesOf(moves), [moves]);
  const curveMarks = useMemo(
    () =>
      divergences.map((divergence) => ({
        ply: divergence.ply,
        glyph: DIVERGENCE_GLYPH[divergence.direction],
        // The DIRECTION, as a slug: this is the sheet's and a driver's hook,
        // not an accessible name. The curve as a whole is `aria-hidden` — the
        // marks are a picture of what the list already says in words — so the
        // sentence belongs on the list's glyph, where it is read aloud.
        label: divergence.direction,
        // **A constant pair, like the severity markers carry.** Left to
        // inherit, the glyph took the theme's ink — and the curve's own fill
        // is theme-INVARIANT, so in dark the mark measured 1.04:1 against it
        // and three of five disappeared into the drawing. A mark on this curve
        // straddles two grounds, so it needs its own ink and its own tint, and
        // both have to come from the family that does not move with the theme
        // (ADR-0013 — the same reason the board's square tints are constant).
        tint: DIVERGENCE_TINT[divergence.direction],
        ink: DIVERGENCE_INK[divergence.direction],
      })),
    [divergences],
  );

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
      // The Player's own marks IN THE LIST — which is what stops the square's
      // tint from being the only cue (ADR-0013). `Board`'s own contract says so
      // in as many words, and ADR-0022 makes it the *condition* of letting a
      // square carry a verdict at all.
      //
      // It matters more here than on the reading route, because this list also
      // carries the ENGINE's severity glyph, drawn from `annotations`. Without
      // this the screen would show two authors in one visual grammar with
      // nothing saying which is whose — on the one screen built to keep the two
      // readings apart. Each glyph carries its own accessible name (`verdict :
      // Correct` against `blunder`), so they are told apart in words today.
      //
      // **Told apart in words is not yet told apart at a glance**, and that is
      // the debt ADR-0022 named for this very screen: *« il devra apporter sa
      // colonne ou son titre »*. Slice 06 pays it, with two titled columns —
      // « Ma lecture » and « Le moteur ». Declared here rather than left to be
      // discovered, because the slices auto-merge (ADR-0027).
      moveMarks={(ply) => <MoveMarks marks={reading.marks} ply={ply} />}
      /*
       * **The comparison, in its own column.** The glyph is the curve's and the
       * words are the cartouche's, both imported rather than retyped: a Player
       * who spots a `▼` on the drawing, finds the same `▼` in the list and
       * reads the same « Bévue ratée » on the cartouche is looking at one fact
       * three times, and it has to *be* one fact.
       */
      moveConfrontation={(ply) => <ConfrontationCell move={byPly.get(ply)} />}
      curveMarks={curveMarks}
      // **The one place two authors may coexist** (ADR-0022): a list has
      // columns, a square has none. The titles are what make the pairing
      // readable — the glyph alone could not, being identical on both sides by
      // construction.
      moveListHeadings={
        <p data-part="move-list-headings" aria-hidden="true">
          <span>Coup</span>
          <span>Ma lecture</span>
          <span>Le moteur</span>
          <span>Confrontation</span>
        </p>
      }
      // The PLAYER's verdict on the square (ADR-0022). Resolved by `markKinds`,
      // the same function `MoveMarks` above uses — never a second rule, so the
      // square and the glyph three centimetres from it cannot say different
      // things about the same ply.
      squareTint={(ply) => {
        const { verdict } = markKinds(reading.marks, ply);
        return verdict ? DECLARED_SEVERITY_SQUARE_TINT[verdict] : undefined;
      }}
      // The arrows step the Moves — and asking for them is what makes the board
      // announce them, so working and announced cannot come apart (US-23, D6).
      keyboardStepping
      focusRequest={focusRequest}
      // **Under the diagram**, not beside it. Read where the eye already is —
      // and, crucially, out of the side pane: in `controls` this block pushed
      // the move list down and shifted it on every ply, which is the opposite
      // of what a list beside a board is for. The step controls are in the
      // other pane, so ADR-0021 holds by construction here.
      underBoard={(ply) => <MoveReadout move={byPly.get(ply) ?? null} marks={reading.marks} />}
    />
  );
}


/**
 * **What the comparison was worth on one Move**, in the list — the curve's
 * glyph and the cartouche's words, from the modules that own them.
 *
 * Sourced, never retyped. The glyph comes from `DIVERGENCE_GLYPH`, which the
 * curve reads; the words from `readingLabel`, which the cartouche reads; the
 * register from the same `tone`, so the row is tinted like the chip under the
 * board. A second copy of any of the three would drift, and the day it did the
 * screen would say two things about one Move — which is the whole defect this
 * story exists to remove.
 *
 * Nothing at ply 0, and nothing on a Move with no reading: a column that
 * repeats "rien" on sixty rows buries the ones that speak.
 */
function ConfrontationCell({ move }: { move: MoveReading | undefined }) {
  if (!move) return null;

  const direction = divergenceAt(move);
  const { tone, label } = readingLabel(move);

  return (
    <span data-part="confrontation-cell" data-tone={tone}>
      {direction && (
        // The shape carries the direction for the eye, the accessible name for
        // everyone else (ADR-0013) — exactly as on the curve.
        <span data-part="divergence" data-direction={direction} aria-label={DIVERGENCE_LABEL[direction]}>
          {DIVERGENCE_GLYPH[direction]}
        </span>
      )}
      {label}
    </span>
  );
}
