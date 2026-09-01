import { DECLARED_SEVERITIES, type DeclaredSeverity } from "../../types";
import {
  DECLARED_SEVERITY_GLYPH,
  DECLARED_SEVERITY_LABEL,
  DECLARED_SEVERITY_MEANING,
} from "./declaredSeverity";

/**
 * The Player's verdict on the Move being read (`Declared severity`, CONTEXT.md):
 * five **exclusive** values, one choice — radios, like the `Review mode`'s own
 * control, because a Move has one verdict and not five independent flags.
 *
 * Nothing is preselected when the Player has said nothing: **silence is not a
 * value**, and a checked default would turn "I have not looked here" into a
 * verdict the Player never posed.
 *
 * It sits beside the board, on the Move currently being read, so annotating
 * thirty Moves is *verdict, Next, verdict, Next* — no intermediate navigation,
 * which is the difference between an exercise and a chore.
 *
 * **Five full-width rows since US-23 (D8)**, each carrying the glyph, the word and
 * what the value claims. The form inputs stay **under** the appearance and the
 * label is the target, so the group semantics survive: native arrows when focused,
 * the "3 of 5" announcement, and the keyboard module's own exemption. Real buttons
 * with a state — what the request said literally — would have cost all three, and
 * the arrows would have gone back to changing the Move mid-verdict.
 */
export function DeclaredSeverityControl({
  ply,
  posed,
  playersOwnMove,
  disabled = false,
  posterior = false,
  onPose,
  onWithdraw,
}: {
  /** The ply being read — 0 is the starting Position, which has no Move to judge. */
  ply: number;
  posed: DeclaredSeverity | null;
  /**
   * Whether the Move is the Player's own. A verdict on the **opponent's** Move is
   * taken all the same — nothing in the model distinguishes the side — but the
   * screen says it will not be scored, so the Player is not left believing they
   * are being marked on it.
   */
  playersOwnMove: boolean;
  disabled?: boolean;
  /**
   * Whether this control writes into the layer **posterior to the seal**. Said in
   * the legend, not only in a paragraph above: a Player who has scrolled past the
   * notice would otherwise see a control identical to the pre-seal one and think
   * they were still amending their sealed reading.
   */
  posterior?: boolean;
  onPose: (severity: DeclaredSeverity) => void;
  /**
   * Returns the Move to **silence**. Five exclusive radios can change a verdict
   * but never unsay one, so without this a verdict posed by mistake would be
   * permanent — while a `Note` can always be erased. Silence is a state of the
   * reading, not an accident of the control.
   */
  onWithdraw: () => void;
}) {
  if (ply === 0) return null;

  return (
    <fieldset data-part="declared-severity">
      <legend>{legendFor({ posterior, playersOwnMove })}</legend>
      {DECLARED_SEVERITIES.map((severity) => (
        /*
         * One full-width ROW per value, carrying the glyph, the word and what the
         * value claims (US-23, D8). It was a wrapping flex of `radio + word`, so
         * inside a 14rem column the five values reflowed into two or three rows of
         * tiny targets — the discomfort was layout, not vocabulary.
         *
         * `data-verdict`, and deliberately **not** `data-severity`: the sheet tints
         * ANY `[data-severity]` with the chrome's severity pair, a rule that exists
         * for the move list's glyph. Wearing that attribute here tinted the three
         * fault rows **while unchosen** — saying "this verdict is posed" about five
         * rows at once — and dropped the claim to 2.75:1 on `Bévue`. The tint of a
         * chosen row is this control's own business, and it comes from the SQUARE
         * family (the board's), not the chrome's.
         *
         * The glyph and the word carry the meaning, so the tint is never the only
         * cue (ADR-0013), and the value is named on the element rather than
         * reaching the accessible name — which is a label, not a hook.
         */
        <label key={severity} data-verdict={severity}>
          <input
            type="radio"
            // Per ply: moving to another Move must not carry the previous one's
            // selection with it.
            name={`declared-severity-${ply}`}
            value={severity}
            checked={posed === severity}
            disabled={disabled}
            onChange={() => onPose(severity)}
          />
          {/* The mark of the SHARED table, so the control and the move list say
              the verdict with the same glyph and re-reading needs no
              translation. Never retyped as a literal here. */}
          <span data-part="glyph" aria-hidden="true">
            {DECLARED_SEVERITY_GLYPH[severity]}
          </span>
          <span data-part="word">{DECLARED_SEVERITY_LABEL[severity]}</span>
          {/* What the value CLAIMS, visible without hovering — and visible for all
              five at once. It was a `title`: invisible to the keyboard, invisible
              to touch, and it carries the most loaded phrase in the model
              ("j'ai regardé, je ne trouve rien à reprocher").

              Revealing it only on the chosen value would move the other four rows
              under the Player's finger, which is precisely what ADR-0021 forbids —
              and showing all five is what makes this control's height constant
              where the reflow made it depend on the width. */}
          <span data-part="claim">{DECLARED_SEVERITY_MEANING[severity]}</span>
        </label>
      ))}
      <button type="button" disabled={disabled || posed === null} onClick={onWithdraw}>
        Retirer mon verdict
      </button>
    </fieldset>
  );
}

/**
 * Which of the **three** legends this control wears. Three, never combined — the
 * combination is the one that would wrap to a second line below 900 px, and it is
 * the one state that cannot occur: after the seal nothing is counted at all
 * (`personal/confrontation.ts` filters `posterior` marks out), so an opponent
 * clause there would say nothing.
 *
 * The opponent warning lives HERE rather than in a paragraph above the radios,
 * and that is ADR-0021 rather than a matter of taste. As a paragraph it appeared
 * and vanished **every other Move** — 33 of the 45 measured displacements of the
 * step controls, which sit below it in the same pane. In the legend it is read
 * *before* the verdict can be posed and moves nothing: measured, the three render
 * on one line at 1400, 900 and 380 px, so the fieldset's height never changes.
 *
 * Said less often, **never less clearly**: this is the wording, not an icon and
 * not a tooltip.
 */
export function legendFor({
  posterior,
  playersOwnMove,
}: {
  posterior: boolean;
  playersOwnMove: boolean;
}): string {
  if (posterior) return "Mon verdict, après le scellement";
  if (!playersOwnMove) return "Mon verdict — coups adverses non notés";
  return "Mon verdict";
}
