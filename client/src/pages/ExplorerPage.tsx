import { useCallback, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";
import { fetchMoveHabits } from "../api";
import { positionAfter, boardFen, sideToMove } from "../chess/positions";
import { candidateArrows } from "../chess/arrows";
import { BOARD_SQUARES } from "../chess/boardTheme";
import { useLoaded } from "../features/load/useLoaded";
import { LoadFailure } from "../features/load/LoadFailure";
import {
  CADENCE_LABEL,
  TIME_CONTROL_CATEGORIES,
  type MoveHabitCandidate,
  type Profile,
  type Side,
} from "../types";

/** One shared empty list, so "nothing loaded yet" is a stable reference. */
const EMPTY: MoveHabitCandidate[] = [];

const percent = (rate: number) => `${Math.round(rate * 100)}%`;

const SIDE_LABEL: Record<Side, string> = { white: "Blancs", black: "Noirs" };

/**
 * Explorateur (`/explorer`): **the current `Profile`'s** `Move habit` explorer —
 * two players' counters are never added into one line (ADR-0014). For the chosen side the
 * Player played, it lists the candidate Moves recorded from the current
 * Position (frequency, win rate, per-time-control breakdown) and lets the
 * Player drill down level by level. Selecting a candidate descends into the
 * resulting Position; a breadcrumb tracks the path and jumps back up. The
 * current Position is derived by replaying the path from the start, so the
 * lookup key matches the server's precomputed one.
 *
 * A failed load says so and offers a retry: an unreachable server must not read
 * as a line this player never walked (`games-load-failure`).
 */
export function ExplorerPage({ profile }: { profile: Profile }) {
  const [side, setSide] = useState<Side>("white");
  const [path, setPath] = useState<string[]>([]);

  const fen = useMemo(() => positionAfter(path), [path]);
  const position = useMemo(() => boardFen(path), [path]);

  const load = useCallback(
    () => fetchMoveHabits(profile.id, fen, side),
    [profile.id, fen, side],
  );
  const loaded = useLoaded(load, [profile.id, fen, side]);
  // One stable reference either way: the loaded array comes from state, and
  // "nothing yet" is the shared empty list — so the arrows below are recomputed
  // when the candidates change and not on every render.
  const candidates = loaded.state === "loaded" ? loaded.data : EMPTY;

  const arrows = useMemo(() => candidateArrows(path, candidates), [path, candidates]);

  const descend = (san: string) => setPath((p) => [...p, san]);

  // react-chessboard v5 has no arrow-click callback, so clicking a candidate's
  // target square descends it — the board's equivalent of clicking the list.
  const descendBySquare = (square: string) => {
    const hit = arrows.find((a) => a.endSquare === square);
    if (hit) descend(hit.san);
  };

  return (
    // `wide`: the board reads beside its candidates, and split inside the 72ch
    // reading column the diagram was down to 317px on a wide screen.
    <section aria-labelledby="explorer-heading" data-width="wide">
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

      {/*
        The side to move is a property of the Position, not of the Player: it
        alternates down the line while the `Board orientation` stays put, and it
        is what says whether the candidates below are the Player's own
        `Move habit`s or the `Opponent reply`s (CONTEXT.md).
      */}
      <p aria-label="trait">Trait aux {SIDE_LABEL[sideToMove(position)]}</p>

      {/* The board's own box. The stylesheet floats it so the breadcrumb and the
          candidate list sit beside the position they annotate, and under it when
          there is no room — no element moved, so the reading order holds. */}
      <div>
        <Chessboard
          options={{
            ...BOARD_SQUARES,
            id: "explorer-board",
            position,
            // Held to the side being explored, all the way down: the Player
            // walks their own repertoire and is not turned around every time
            // the opponent has the move (CONTEXT.md → Board orientation).
            boardOrientation: side,
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

      {/*
        The breadcrumb and the candidates are ONE pane beside the diagram, and they
        are wrapped as one because the alternative does not work: two separate grid
        items in the same column, next to a board spanning both their rows, force
        the board's height to be split between those rows — which opened a 250px
        hole between the breadcrumb and the first candidate. One item, one column,
        no distribution to fight.
      */}
      <div data-pane="candidates">
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

        {loaded.state === "failed" ? (
          <LoadFailure what="vos coups" error={loaded.error} onRetry={loaded.retry} />
        ) : loaded.state === "loading" ? (
          <p role="status">Chargement de vos coups…</p>
        ) : candidates.length === 0 ? (
          <p>Aucun coup enregistré plus loin dans cette ligne.</p>
        ) : (
          <ul aria-label="candidates">
            {candidates.map((c) => (
              <li key={c.san}>
                <button type="button" onClick={() => descend(c.san)}>
                  {c.san}
                </button>{" "}
                — {c.count} {c.count > 1 ? "parties" : "partie"} · {percent(c.winRate)} ·{" "}
                {/* The five categories, from the one list of them: a breakdown
                    that quietly omitted one would stop adding up to `count`. */}
                {TIME_CONTROL_CATEGORIES.map((cat) => `${CADENCE_LABEL[cat]} ${c.byCategory[cat]}`).join(", ")}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
