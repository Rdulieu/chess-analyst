/**
 * The `Key moment` (CONTEXT.md): the Player declares that **this is where the
 * Game turned**.
 *
 * A **checkbox and not a sixth radio**, deliberately. It sits right beside the
 * five `Declared severity` values, and a Player who read it as one more verdict
 * would have the wrong idea entirely: a Key moment is **neither a good Move nor
 * a fault**, it is a pivot. The screen says that in words, because the shape of
 * the control alone will not carry it.
 *
 * Independent of the verdict and the `Note` on the same Move: the three are three
 * different statements, and posing one never disturbs another.
 *
 * **No ceiling** on how many a reading may hold — a Game can turn twice, and the
 * Player is not asked to pick. The **count** is shown instead (the project's
 * constant habit: marking twelve Moves out of thirty is not forbidden, it is
 * visible) — but by `KeyMomentCount` below, not here: the tally is a property of
 * the whole reading, and hiding it on the starting Position would make it come
 * and go as the Player steps.
 */
export function KeyMomentControl({
  ply,
  posed,
  disabled = false,
  onToggle,
}: {
  /** The ply being read; the starting Position is not a Move and cannot be a pivot. */
  ply: number;
  posed: boolean;
  disabled?: boolean;
  onToggle: (posed: boolean) => void;
}) {
  if (ply === 0) return null;

  return (
    <div data-part="key-moment">
      <label>
        <input
          type="checkbox"
          checked={posed}
          disabled={disabled}
          onChange={(event) => onToggle(event.target.checked)}
        />{" "}
        Moment clé : c'est ici que la partie a tourné
      </label>
      {/* Said, not implied. Beside five verdicts, an unexplained sixth control
          reads as a sixth verdict. */}
      <p data-part="pivot-notice">
        Ni un bon coup ni une faute : un pivot. Ce n'est pas un jugement de qualité.
      </p>
    </div>
  );
}

/**
 * How many `Key moment`s this reading holds — never a cap, always the figure.
 * Read from the reading itself rather than from one ply's control, so it does not
 * disappear when the Player steps onto the starting Position.
 */
export function KeyMomentCount({ total }: { total: number }) {
  return (
    <p data-part="key-moment-count">
      {total === 0
        ? "Aucun moment clé posé sur cette partie."
        : `${total} moment${total > 1 ? "s" : ""} clé${total > 1 ? "s" : ""} posé${total > 1 ? "s" : ""} sur cette partie.`}
    </p>
  );
}
