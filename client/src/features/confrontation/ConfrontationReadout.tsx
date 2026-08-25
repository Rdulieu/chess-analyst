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
export function ConfrontationReadout({ confrontation }: { confrontation: GameConfrontation }) {
  const { countedMoves, examined, scorable, agreed } = confrontation.severity;

  return (
    <div data-part="confrontation-severity">
      <Figure
        name="Ce que j'ai examiné"
        of={countedMoves}
        count={examined}
        unit="coups comptés"
        // Said in words, because the number alone invites the wrong question.
        // Coverage answers *did I look*, and nothing else.
        note="Sur les coups que l'analyse vous compte. Un coup sur lequel vous n'avez rien dit n'est ni juste ni faux : il n'a pas été examiné."
      />
      <Figure
        name="Ce que j'ai vu juste"
        of={scorable}
        count={agreed}
        unit="verdicts confrontables"
        note="Sur les verdicts que vous avez posés. Un désaccord dit où regarder, pas qui se trompe."
      />
    </div>
  );
}

/**
 * One figure, with its count beside its rate and never without it — and with the
 * question it answers named, so two figures side by side cannot be read as one.
 *
 * A **null denominator gives no rate**, not a zero: nothing was there to judge,
 * and a `0 %` would read as a failure where there was no attempt.
 */
function Figure({
  name,
  count,
  of,
  unit,
  note,
}: {
  name: string;
  count: number;
  of: number;
  unit: string;
  note: string;
}) {
  return (
    <fieldset data-part="figure" aria-label={name}>
      <legend>{name}</legend>
      <p data-part="figure-value">
        {of === 0 ? (
          <strong>Pas de chiffre</strong>
        ) : (
          <>
            <strong>{Math.round((count / of) * 100)} %</strong> — {count} sur {of} {unit}
          </>
        )}
      </p>
      <p data-part="figure-note">{note}</p>
    </fieldset>
  );
}
