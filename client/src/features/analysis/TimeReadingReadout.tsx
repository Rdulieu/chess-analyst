import { formatDuration, formatShare } from "../../chess/moveTime";
import { plyNumber, type StartingPoint } from "../confrontation/moveName";
import type { GameTime, LongMove, TimeReading } from "../../types";

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
  start,
}: {
  reading: TimeReading;
  precision: GameTime["precision"];
  /** Where the Move numbering counts from — the same one the move list uses, so
   *  the two cannot name the same Move differently on one screen. */
  start: StartingPoint;
}) {
  const total = formatDuration(reading.totalSpentCs, precision);
  /**
   * The mark is printed at whole-second precision **whatever the column's is**,
   * and that is not an inconsistency: it is not a measurement. It is an exact
   * scale derived from the cadence, so a decimal on it would imply a measured
   * tenth where there is nothing measured at all.
   */
  const mark = formatDuration(reading.lowClockCs, "seconds");
  /**
   * The one `Clock` reading that belongs to no `Move` — what the side to move
   * had left when the Game ended without them playing. `null` is said **"sans
   * objet"**, not left blank: on a mate there was nobody to read, and chess.com
   * exposes no equivalent at all. Neither is a gap in what we fetched.
   */
  const lastClock = formatDuration(reading.lastClockCs, precision);

  return (
    <section aria-labelledby="time-reading-heading" className="card" data-part="time-reading">
      <h3 id="time-reading-heading">Votre temps sur cette partie</h3>
      <p>
        Vous avez joué <strong>{reading.moves}</strong> coup{reading.moves > 1 ? "s" : ""}, en{" "}
        <strong>{total}</strong> au total
        {/* Only when the two differ, and then said plainly. A total that quietly
            covered fewer Moves than the count beside it would be a figure the
            Player could not check — and an absence folded in as a zero is what
            a later aggregate would average. */}
        {reading.measuredMoves < reading.moves && (
          <span data-part="partial">
            {" "}
            — sur les <strong>{reading.measuredMoves}</strong> dont l'horloge est connue
          </span>
        )}
        .
      </p>
      <p data-part="last-clock">
        {/* A fact about the GAME, not about any Move — which is why it is stated
            here and appears nowhere in the column. */}
        Temps restant au camp qui n'a pas joué le dernier coup :{" "}
        <strong>{lastClock ?? "sans objet"}</strong>
        {lastClock === null && " (partie matée, ou partie chess.com)"}.
      </p>
      <p data-part="low-clock">
        {/* The mark is named, so the Player can count the same Moves themselves
            rather than take the count on trust. */}
        Sous les <strong>{mark}</strong> restantes : <strong>{reading.underLowClock}</strong> de vos
        coups.
      </p>
      {/*
        **Two rankings, and they are not the same list.** Seconds say what a Move
        cost; the share says what it cost relative to what was left. On a real
        Game they disagree — a 1,1 s Move with 14 s left is a third of the clock,
        and it never appears in a ranking by seconds — so serving only one of them
        hides either the long think or the late panic it caused.
      */}
      {reading.longest.length > 0 && (
        <p data-part="longest">
          Vos coups les plus longs :{" "}
          {reading.longest.map((move) => describe(move, precision, start)).join(", ")}.
        </p>
      )}
      {reading.costliestShare.length > 0 && (
        <p data-part="costliest-share">
          Vos coups les plus chers, en part de ce qu'il vous restait :{" "}
          {reading.costliestShare.map((move) => describe(move, precision, start)).join(", ")}.
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
 * One ranked Move, said the same way in both lists: its number, its seconds and
 * its share. **The same wording in both** is deliberate — the lists differ by
 * what they rank, not by what they say, so a reader comparing them is comparing
 * the ordering and nothing else.
 *
 * A Move whose share is unknown prints its seconds alone rather than a `0 %`.
 */
function describe(
  move: LongMove,
  precision: GameTime["precision"],
  start: StartingPoint,
): string {
  const share = formatShare(move.shareOfRemaining);
  const spent = formatDuration(move.spentCs, precision);
  return `${plyNumber(move.ply, start)} (${spent}${share === null ? "" : ` — ${share}`})`;
}
