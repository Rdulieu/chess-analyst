import { formatDuration } from "../../chess/moveTime";
import type { GameTime, TimeReading } from "../../types";

/**
 * What this Game says about the Player's **time** (US-15b), read in the recap
 * panel beside what the Game contributes to the analysis.
 *
 * Its place is a layout decision, and a deliberate one: a visually separate
 * block would say the time is of another nature, where the EPIC wants it to be
 * **one axis among the others**. It is nonetheless a panel of its own, because
 * it exists on a Game with no analysis at all — `rapid` has none — where the
 * analysis recap is legitimately absent.
 *
 * **None of these figures is this component's own arithmetic.** They are folded
 * server-side over the very per-Move numbers the column prints (ADR-0017), so
 * the Player can add the column up by hand and land on the total stated here.
 * Two implementations of one method agree only by luck.
 *
 * **No threshold, no ranking, no verdict on what to work on.** That is US-15c
 * and US-15d, and ADR-0023 records what choosing a threshold on paper costs. The
 * low-clock mark below is a **scale** read off the cadence, and it is stated
 * rather than hidden precisely so it can be disagreed with.
 */
export function TimeReadingReadout({
  reading,
  precision,
}: {
  reading: TimeReading;
  precision: GameTime["precision"];
}) {
  const total = formatDuration(reading.totalSpentCs, precision);
  /**
   * The mark is printed at whole-second precision **whatever the column's is**,
   * and that is not an inconsistency: it is not a measurement. It is an exact
   * scale derived from the cadence, so a decimal on it would imply a measured
   * tenth where there is nothing measured at all.
   */
  const mark = formatDuration(reading.lowClockCs, "seconds");

  return (
    <section aria-labelledby="time-reading-heading" className="card" data-part="time-reading">
      <h3 id="time-reading-heading">Votre temps sur cette partie</h3>
      <p>
        Vous avez joué <strong>{reading.moves}</strong> coup{reading.moves > 1 ? "s" : ""}, en{" "}
        <strong>{total}</strong> au total.
      </p>
      <p data-part="low-clock">
        {/* The mark is named, so the Player can count the same Moves themselves
            rather than take the count on trust. */}
        Sous les <strong>{mark}</strong> restantes : <strong>{reading.underLowClock}</strong> de vos
        coups.
      </p>
      {reading.longest.length > 0 && (
        <p data-part="longest">
          Vos coups les plus longs :{" "}
          {reading.longest
            .map((move) => `${moveNumber(move.ply)} (${formatDuration(move.spentCs, precision)})`)
            .join(", ")}
          .
        </p>
      )}
      <p data-part="within">
        {/* The cadence is carried with the reading, and said, because a second in
            bullet and a second in classical are not the same second: these
            figures are read INSIDE one cadence and never across two. */}
        À lire dans la cadence de cette partie, jamais d'une cadence à l'autre.
      </p>
    </section>
  );
}

/**
 * How a ply is named to the Player — the Move number they can find on their own
 * board, `12.` on White's half and `12…` on Black's. A bare ply index is a
 * number; a Move number is a place in the Game.
 */
function moveNumber(ply: number): string {
  return `${Math.ceil(ply / 2)}${ply % 2 === 1 ? "." : "…"}`;
}
