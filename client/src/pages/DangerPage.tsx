import { useEffect, useState } from "react";
import { Chessboard } from "react-chessboard";
import { fetchDangerView, type DangerView } from "../api";
import { sideToMove } from "../chess/positions";
import { BOARD_SQUARES } from "../chess/boardTheme";
import type { DangerEntry } from "../types";

const percent = (rate: number) => `${Math.round(rate * 100)} %`;

const SIDE_LABEL = { white: "Blancs", black: "Noirs" } as const;

/** A `Danger position` is highlighted at a 50%+ serious-error proportion (CONTEXT.md). */
const isDangerous = (d: DangerEntry) => d.proportion >= 0.5;

/** A 4-field `Danger position` FEN, padded to a full FEN for board rendering (halfmove/fullmove are irrelevant to the diagram). */
const boardFen = (fen: string) => `${fen} 0 1`;

/** How many diagrams the page draws. The endpoint serves the full ranked list;
 *  rendering a board per entry is what costs, so the cap is a display decision
 *  and can be retuned without touching the contract or the term's definition. */
const SHOWN_AT_MOST = 30;

/**
 * Positions dangereuses (`/danger`): every recurring Position the Player has
 * reached across their analyzed Games, with its reach count and serious-error
 * proportion (CONTEXT.md `Danger position`), derived on the fly server-side.
 *
 * Four outcomes, each with its own state and none reachable as a fallback for
 * another — a failed request used to land on the "analysez vos parties"
 * branch, telling the Player to do what they had just done.
 */
export function DangerPage() {
  const [view, setView] = useState<DangerView | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setView(null);
    setFailure(null);
    fetchDangerView()
      .then((loaded) => current && setView(loaded))
      .catch((cause: Error) => current && setFailure(cause.message));
    return () => {
      current = false;
    };
  }, [attempt]);

  // The four outcomes, named once and mutually exclusive by construction —
  // rather than left to the order of a chain of ternaries.
  const state = failure
    ? "error"
    : !view
      ? "computing"
      : view.dangers.length > 0
        ? "positions"
        : view.analyzedGames === 0
          ? "nothing-analyzed"
          : "nothing-recurring";

  return (
    // `wide`: thirty diagrams laid out as a grid need more than the reading column.
    <section aria-labelledby="danger-heading" data-width="wide">
      <h2 id="danger-heading">Positions dangereuses</h2>

      {state === "error" && (
        <div role="alert">
          {/* The cause is carried through, so a server that is down does not
              read like a server that is broken. */}
          <p>Erreur : impossible de calculer vos positions dangereuses ({failure}).</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Réessayer
          </button>
        </div>
      )}

      {/* Text, not a spinner: the wait is short enough that a spinner would
          flash and read as a rendering glitch. In a live region, so it is
          announced rather than merely drawn. */}
      {state === "computing" && <p role="status">Calcul de vos positions dangereuses…</p>}

      {state === "nothing-analyzed" && (
        <p>Analysez vos parties pour découvrir vos positions dangereuses.</p>
      )}

      {/* Reachable only since the recurrence floor: with one or two analyzed
          Games, nothing recurs yet. Points at what helps rather than repeating
          the invitation, which would read as "you have done nothing". */}
      {state === "nothing-recurring" && (
        <p>
          Vos parties analysées ne repassent pas encore par une même position. Analysez d'autres
          parties pour faire apparaître vos positions dangereuses.
        </p>
      )}

      {state === "positions" && <DangerList dangers={view!.dangers} />}
    </section>
  );
}

/** The ranked entries themselves — capped for display, with the real total
 *  stated when it exceeds the cap. */
function DangerList({ dangers }: { dangers: DangerEntry[] }) {
  return (
    <>
      {dangers.length > SHOWN_AT_MOST && (
        <p>
          {dangers.length} positions dangereuses — les {SHOWN_AT_MOST} plus dangereuses sont
          affichées.
        </p>
      )}
      <ul aria-label="positions dangereuses">
        {dangers.slice(0, SHOWN_AT_MOST).map((d, i) => (
          <li
            key={d.fen}
            // Same review tint as the weak `Opening`, from the same token: one
            // meaning, one colour, said the same way on both screens.
            data-serious={isDangerous(d) ? "true" : undefined}
          >
            {/* A self-contained card: the diagram, the side to move and the
                figures of one Position, laid out as a reflowing grid rather than
                a single column (the stylesheet's `_dense`). */}
            <article>
              <div>
                <Chessboard
                  options={{
                    ...BOARD_SQUARES,
                    id: `danger-board-${i}`,
                    position: boardFen(d.fen),
                    // Oriented to the side that has the move, read from the
                    // entry's own stored FEN. Orienting to "the Player's side"
                    // is **undefined** here, not merely unimplemented: the
                    // 4-field FEN identity carries no player side, so one entry
                    // merges Games played as White and as Black
                    // (CONTEXT.md → Board orientation).
                    boardOrientation: sideToMove(d.fen),
                    allowDragging: false,
                    showAnimations: false,
                  }}
                />
              </div>
              {/* Spelled out, so the fact is not carried by the orientation alone. */}
              <p aria-label="trait">Trait aux {SIDE_LABEL[sideToMove(d.fen)]}</p>
              <p>
                {d.reached} fois atteinte · {percent(d.proportion)} d'erreur sérieuse
                {isDangerous(d) && (
                  <span
                    title="Position dangereuse, à revoir"
                    aria-label="position dangereuse, à revoir"
                  >
                    {" "}
                    ⚠
                  </span>
                )}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </>
  );
}
