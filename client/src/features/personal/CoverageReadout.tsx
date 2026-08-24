import { coverage } from "./coverage";
import type { PersonalMark } from "../../types";

/**
 * **Coverage** (US-16a): how far the reading has got. The figure the Player uses
 * to judge whether their reading is advanced enough to seal.
 *
 * The **count beside the share**, always — a bare percentage hides whether it
 * rests on two Moves or on forty, and that judgement is the Player's.
 *
 * Nothing here is a score. No correctness, no comparison, nothing right or wrong:
 * that is US-16b, and it stays out. Coverage says *what was looked at*; it says
 * nothing at all about what was said.
 */
export function CoverageReadout({ marks, moves }: { marks: PersonalMark[]; moves: number }) {
  const { examined, share } = coverage(marks, moves);
  return (
    <p data-part="coverage">
      {examined} / {moves} coups examinés ({Math.round(share * 100)} %)
    </p>
  );
}
