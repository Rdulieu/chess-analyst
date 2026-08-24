import { CoverageReadout } from "./CoverageReadout";
import { KeyMomentCount } from "./KeyMomentControl";
import type { PersonalMark } from "../../types";

/**
 * **Where the reading stands** — its own figures, grouped and named as such.
 *
 * Grouped deliberately. Left loose, the coverage line and the `Key moment` count
 * sat directly under the sentence explaining what a pivot is, in the same muted
 * type, and read as a third line of that explanation rather than as the reading's
 * tally. Elsewhere this project puts a count beside its rate; here the figures
 * needed a place of their own before they could be read as figures.
 *
 * Every number here answers *how much have I looked at*. **None** of them answers
 * *was I right* — no score, no comparison, nothing correct or incorrect. That is
 * US-16b, and keeping the two apart is the point: coverage and correctness are
 * reported side by side there, never folded into one figure.
 */
export function ReadingTally({ marks, moves }: { marks: PersonalMark[]; moves: number }) {
  return (
    <fieldset data-part="tally" aria-label="Où j'en suis dans cette lecture">
      <legend>Où j'en suis</legend>
      <CoverageReadout marks={marks} moves={moves} />
      <KeyMomentCount total={marks.filter((m) => m.keyMoment).length} />
    </fieldset>
  );
}
