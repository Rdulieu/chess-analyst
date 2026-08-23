import { REVIEW_MODES, type ReviewMode } from "./reviewMode";

/** What each level is called on screen, and what it promises to reveal. */
const LABEL: Record<ReviewMode, string> = {
  unaided: "Sans aide",
  annotated: "Annoté",
  detailed: "Détaillé",
};

/**
 * The `Review mode`'s single control (CONTEXT.md): three **exclusive** levels,
 * one choice. Radios and not checkboxes, and that is the whole point — two
 * independent switches would allow "the record without the annotations", a page
 * stating what a Move cost while claiming to show nothing of the engine.
 *
 * It sits in the pane beside the board, with the readout it governs: everything
 * stacked above the diagram is height the diagram does not get.
 */
export function ReviewModeControl({
  mode,
  onChange,
}: {
  mode: ReviewMode;
  onChange: (mode: ReviewMode) => void;
}) {
  return (
    <fieldset role="radiogroup" aria-label="Niveau de revue" data-part="review-mode">
      <legend>Niveau de revue</legend>
      {REVIEW_MODES.map((level) => (
        <label key={level}>
          <input
            type="radio"
            name="review-mode"
            value={level}
            checked={mode === level}
            onChange={() => onChange(level)}
          />{" "}
          {LABEL[level]}
        </label>
      ))}
    </fieldset>
  );
}
