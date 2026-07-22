import { useEffect, useState } from "react";
import { fetchMoveHabits } from "../api";
import type { MoveHabitCandidate, Side } from "../types";

/** 4-field FEN of the standard starting Position — the explorer's top level. */
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -";

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

/**
 * Explorateur (`/explorer`): the `Move habit` explorer. For the chosen side the
 * Player played, lists the candidate Moves recorded from the starting Position
 * with frequency, win rate and a per-time-control breakdown. Drill-down and
 * board arrows arrive in later sub-issues; this slice shows the top level only.
 */
export function ExplorerPage() {
  const [side, setSide] = useState<Side>("white");
  const [candidates, setCandidates] = useState<MoveHabitCandidate[]>([]);

  useEffect(() => {
    let active = true;
    fetchMoveHabits(START_FEN, side)
      .then((c) => active && setCandidates(c))
      .catch(() => active && setCandidates([]));
    return () => {
      active = false;
    };
  }, [side]);

  return (
    <section aria-labelledby="explorer-heading">
      <h2 id="explorer-heading">Explorateur</h2>

      <fieldset>
        <legend>Côté</legend>
        <label>
          <input
            type="radio"
            name="side"
            checked={side === "white"}
            onChange={() => setSide("white")}
          />
          Blancs
        </label>
        <label>
          <input
            type="radio"
            name="side"
            checked={side === "black"}
            onChange={() => setSide("black")}
          />
          Noirs
        </label>
      </fieldset>

      <ul aria-label="candidates">
        {candidates.map((c) => (
          <li key={c.san}>
            <span>{c.san}</span> — {c.count} parties · {percent(c.winRate)} · bullet{" "}
            {c.byCategory.bullet}, blitz {c.byCategory.blitz}, rapid {c.byCategory.rapid}, daily{" "}
            {c.byCategory.daily}
          </li>
        ))}
      </ul>
    </section>
  );
}
