import type { LinePly, ReviewedMove } from "../../chess/bestLine";
import { SEVERITY_GLYPH } from "../../chess/severity";
import { PHASE_LABEL, type Phase } from "../../chess/phase";
import { COUNTED_STATEMENT, COUNTED_YES } from "../../chess/counted";
import type { MoveAnnotation } from "../../types";

/**
 * The reviewed Move's own record (CONTEXT.md, `Review mode` → Detailed): what
 * should have been played instead and how it would have continued, and how the
 * Move actually played is punished. Both are `Best line`s — the line of the
 * Position **before** the Move, and the line of the Position **after** it, which
 * starts with the opponent's best reply. One term, two readings, no second thing
 * to store.
 *
 * **One Move at a time**: comparing Moves is the aggregate's job, not this
 * panel's. The panel is titled and lives **below** the board row — its height
 * varies with the lines it shows, and nothing above the diagram may move when
 * the Player steps from one Move to the next.
 *
 * Nothing to report is **said**, not left blank: a panel that empties silently
 * reads as a panel that broke.
 */
export function MoveRecord({
  record,
  phase,
  counted,
  onPreview,
}: {
  /** The reviewed Move's record, or `null` when there is nothing to report. */
  record: ReviewedMove | null;
  /**
   * The `Phase` the reviewed Move was played in. Named on **every** Move and not
   * only on a flawed one: "where in the Game was this played" is a question about
   * the Move, not about the mistake — and the threshold is a heuristic the Player
   * is meant to be able to disagree with.
   */
  phase: Phase | null;
  /**
   * Whether the reviewed Move counts in the analysis, and why not when it does
   * not. `null` on the opponent's Moves and on the starting Position, where the
   * panel asserts **nothing** — the denominator is about the Player's play, and
   * "not counted" said of the opponent would invite the reading that it might
   * have been.
   */
  counted: MoveAnnotation["counted"];
  /**
   * Previewing a ply of a line: the Position to show temporarily, or `null` to
   * go back, and **through which channel** — the focus and the pointer are
   * reported separately because they can disagree (the pointer can leave a
   * button that still holds focus), and a keyboard reader must not lose their
   * preview to a mouse that happened to be resting there. The preview is
   * **never** allowed to touch the navigation index — `Board` keeps that as the
   * single source of "where the Player is".
   */
  onPreview: (fen: string | null, via: "focus" | "hover") => void;
}) {
  return (
    <section aria-labelledby="move-record-heading" className="card" data-part="record">
      <h3 id="move-record-heading">Relevé du coup</h3>
      {phase && (
        <p data-part="phase">
          Phase : <strong>{PHASE_LABEL[phase]}</strong>
        </p>
      )}
      {counted && (
        <p data-part="counted" data-counted={counted.counted}>
          {counted.counted || counted.reason === null
            ? COUNTED_YES
            : COUNTED_STATEMENT[counted.reason]}
        </p>
      )}
      {record ? (
        <>
          <p>
            Coup joué : <strong>{SEVERITY_GLYPH[record.severity]}</strong>{" "}
            <span>({record.severity})</span>
          </p>
          <Line
            label="Il fallait jouer"
            plies={record.shouldHavePlayed}
            hidden={record.shouldHavePlayedHidden}
            onPreview={onPreview}
          />
          <Line
            label="Réfutation"
            plies={record.refutation}
            hidden={record.refutationHidden}
            onPreview={onPreview}
          />
        </>
      ) : (
        <p>Rien à signaler sur ce coup.</p>
      )}
    </section>
  );
}

/**
 * One `Best line`, ply by ply. Each ply is a **button**, and that is the whole
 * mechanism: focusing it previews that Position, blurring it goes back. The
 * pointer's hover is the same control's pointer affordance, not a second code
 * path — which is what keeps the only feature that makes a line readable
 * available to the keyboard as well.
 *
 * The button's accessible name is its SAN, so the line reads as a list of Moves
 * rather than as one opaque string.
 */
function Line({
  label,
  plies,
  hidden,
  onPreview,
}: {
  label: string;
  plies: LinePly[];
  /** Plies the cap leaves out, stated rather than silently dropped. */
  hidden: number;
  onPreview: (fen: string | null, via: "focus" | "hover") => void;
}) {
  if (plies.length === 0) return null;

  return (
    <div role="group" aria-label={label} data-part="line">
      <span>{label} :</span>
      {plies.map((ply, i) => (
        <button
          key={i}
          type="button"
          onFocus={() => onPreview(ply.fen, "focus")}
          onBlur={() => onPreview(null, "focus")}
          onMouseEnter={() => onPreview(ply.fen, "hover")}
          onMouseLeave={() => onPreview(null, "hover")}
        >
          {ply.san}
        </button>
      ))}
      {hidden > 0 && (
        // In text and not as a bare ellipsis: the count is what a screen reader
        // reads out, and it is the honest statement — the line goes on, this is
        // where the display stops. Walking the rest of it is US-16's mechanic.
        <span>(+{hidden} coups de plus)</span>
      )}
    </div>
  );
}
