import { ConfusionMatrixTable } from "./ConfusionMatrixTable";
import { Figure } from "./Figure";
import { KeyMomentReadout } from "./KeyMomentReadout";
import type { GameConfrontation } from "../../types";

/**
 * The `Confrontation`'s first reading (CONTEXT.md): the Player's `Declared
 * severity`s against the measured ones, as **two figures that are never fused**.
 *
 * - **Coverage** — what share of the `Counted Move`s was examined at all. Silence
 *   is not a verdict, and how much of a Game a reading covers is a fact about the
 *   reading.
 * - **Accuracy** — over those, how justly.
 *
 * A Player who annotates three Moves and judges them perfectly has 100% accuracy
 * and 15% coverage, and **both are true**. Merging them would need a weight, and
 * a single number can be optimised — the only way to optimise it being to
 * **imitate the engine**, which is the one outcome this whole story exists
 * against. So there is no composite here, under any name.
 *
 * Two groups rather than two lines, for the same reason US-16a had to group its
 * own tally: loose figures read as a continuation of the sentence above them
 * instead of as figures. And the **count travels with the rate**, always — a bare
 * percentage hides whether it rests on three Moves or on forty.
 */
export function ConfrontationReadout({
  confrontation,
}: {
  confrontation: GameConfrontation;
}) {
  const { countedMoves, examined, scorable, agreed, matrix } =
    confrontation.severity;

  return (
    <>
      {/* The two rates sit in a grid of their own — two equal columns, and only
          two. The matrix is deliberately OUTSIDE it: inside, it became a third
          grid cell and was sized as a column, which hid two of its four columns
          behind a scrollbar on a window with room to spare. */}
      <div data-part="confrontation-severity">
        <Figure
          name="Ce que j'ai examiné"
          of={countedMoves}
          count={examined}
          unit="coups comptés"
          singular="coup compté"
          // Said in words, because the number alone invites the wrong question.
          // Coverage answers *did I look*, and nothing else.
          note="Sur les coups que l'analyse vous compte. Un coup sur lequel vous n'avez rien dit n'est ni juste ni faux : il n'a pas été examiné."
        />
        <Figure
          name="Ce que j'ai vu juste"
          of={scorable}
          count={agreed}
          unit="verdicts confrontables"
          singular="verdict confrontable"
          note="Sur les verdicts que vous avez posés. Un désaccord dit où regarder, pas qui se trompe."
        />
        {/* The second reading, IN the same grid as the first two and never fused
            with them. Their disagreement is the diagnosis: strong here and weak
            there means the Player sees *where* a Game turns but cannot yet name
            *what* happens. A single figure would have erased that. */}
        <KeyMomentReadout keyMoments={confrontation.keyMoments} />
      </div>
      {/* HOW the Player is wrong, UNDER the figures and not beside them: the two
          rates answer *how much*, and the matrix is what explains them. */}
      <ConfusionMatrixTable matrix={matrix} />
    </>
  );
}
