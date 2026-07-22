import { useEffect, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { fetchMoveHabits } from "../api";
import { positionAfter, boardFen } from "../chess/positions";
import { candidateArrows } from "../chess/arrows";
import type { MoveHabitCandidate, Side } from "../types";

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

/**
 * Explorateur (`/explorer`): the `Move habit` explorer. For the chosen side the
 * Player played, it lists the candidate Moves recorded from the current
 * Position (frequency, win rate, per-time-control breakdown) and lets the
 * Player drill down level by level. Selecting a candidate descends into the
 * resulting Position; a breadcrumb tracks the path and jumps back up. The
 * current Position is derived by replaying the path from the start, so the
 * lookup key matches the server's precomputed one. Board arrows arrive in the
 * next sub-issue.
 */
export function ExplorerPage() {
  const [side, setSide] = useState<Side>("white");
  const [path, setPath] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<MoveHabitCandidate[]>([]);

  const fen = useMemo(() => positionAfter(path), [path]);
  const position = useMemo(() => boardFen(path), [path]);
  const arrows = useMemo(() => candidateArrows(path, candidates), [path, candidates]);

  useEffect(() => {
    let active = true;
    fetchMoveHabits(fen, side)
      .then((c) => active && setCandidates(c))
      .catch(() => active && setCandidates([]));
    return () => {
      active = false;
    };
  }, [fen, side]);

  const descend = (san: string) => setPath((p) => [...p, san]);

  // react-chessboard v5 has no arrow-click callback, so clicking a candidate's
  // target square descends it — the board's equivalent of clicking the list.
  const descendBySquare = (square: string) => {
    const hit = arrows.find((a) => a.endSquare === square);
    if (hit) descend(hit.san);
  };

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

      <div style={{ maxWidth: 480 }}>
        <Chessboard
          options={{
            id: "explorer-board",
            position,
            allowDragging: false,
            showAnimations: false,
            arrows: arrows.map(({ startSquare, endSquare, color }) => ({
              startSquare,
              endSquare,
              color,
            })),
            onSquareClick: ({ square }) => descendBySquare(square),
          }}
        />
      </div>

      <nav aria-label="breadcrumb">
        <ol>
          <li>
            <button type="button" onClick={() => setPath([])}>
              Départ
            </button>
          </li>
          {path.map((san, i) => (
            <li key={i}>
              <button type="button" onClick={() => setPath(path.slice(0, i + 1))}>
                {san}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {candidates.length === 0 ? (
        <p>Aucun coup enregistré plus loin dans cette ligne.</p>
      ) : (
        <ul aria-label="candidates">
          {candidates.map((c) => (
            <li key={c.san}>
              <button type="button" onClick={() => descend(c.san)}>
                {c.san}
              </button>{" "}
              — {c.count} {c.count > 1 ? "parties" : "partie"} · {percent(c.winRate)} · bullet{" "}
              {c.byCategory.bullet}, blitz{" "}
              {c.byCategory.blitz}, rapid {c.byCategory.rapid}, daily {c.byCategory.daily}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
