import { DECLARED_SEVERITIES, type DeclaredSeverity } from "../../types";
import { DECLARED_SEVERITY_LABEL, DECLARED_SEVERITY_MEANING } from "./declaredSeverity";

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
 */
export function DeclaredSeverityControl({
  ply,
  posed,
  playersOwnMove,
  disabled = false,
  onPose,
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
  onPose: (severity: DeclaredSeverity) => void;
}) {
  if (ply === 0) return null;

  return (
    <fieldset data-part="declared-severity">
      <legend>Mon verdict</legend>
      {!playersOwnMove && (
        // Said here and not only in the glossary: the Player is about to judge a
        // Move that is not theirs, and would otherwise reasonably assume the
        // confrontation will mark them on it.
        <p data-part="uncounted-notice">
          Coup de l'adversaire : votre verdict est conservé, mais il ne sera pas noté.
        </p>
      )}
      {DECLARED_SEVERITIES.map((severity) => (
        <label key={severity} title={DECLARED_SEVERITY_MEANING[severity]}>
          <input
            type="radio"
            // Per ply: moving to another Move must not carry the previous one's
            // selection with it.
            name={`declared-severity-${ply}`}
            value={severity}
            checked={posed === severity}
            disabled={disabled}
            onChange={() => onPose(severity)}
          />{" "}
          {DECLARED_SEVERITY_LABEL[severity]}
        </label>
      ))}
    </fieldset>
  );
}
