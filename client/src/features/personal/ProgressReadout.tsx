import { readingProgress } from "./progress";
import type { PersonalMark } from "../../types";

/**
 * **How far the reading has got** (US-16a). The figure the Player uses to judge
 * whether their reading is advanced enough to seal.
 *
 * The **count beside the share**, always — a bare percentage hides whether it
 * rests on two Moves or on forty, and that judgement is the Player's.
 *
 * Nothing here is a score. No correctness, no comparison, nothing right or wrong:
 * that is the `Confrontation`, and it stays out. And this is **not** the
 * Confrontation's coverage either — that one runs over the Player's `Counted
 * Move`s, this one over every Move of the Game. Different questions, different
 * denominators, and now different words: *annotés* here, *examinés* there.
 */
export function ProgressReadout({ marks, moves }: { marks: PersonalMark[]; moves: number }) {
  const { annotated, share } = readingProgress(marks, moves);
  return (
    <p data-part="reading-progress">
      {annotated} / {moves} coups annotés ({Math.round(share * 100)} %)
    </p>
  );
}
