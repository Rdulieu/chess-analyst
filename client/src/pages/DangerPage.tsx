import { useEffect, useState } from "react";
import { Chessboard } from "react-chessboard";
import { fetchDangerPositions } from "../api";
import { sideToMove } from "../chess/positions";
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
 * With no analyzed Games, shows an invitation only.
 */
export function DangerPage() {
  const [dangers, setDangers] = useState<DangerEntry[] | null>(null);

  useEffect(() => {
    fetchDangerPositions()
      .then(setDangers)
      .catch(() => setDangers([]));
  }, []);

  return (
    <section aria-labelledby="danger-heading">
      <h2 id="danger-heading">Positions dangereuses</h2>

      {!dangers ? null : dangers.length === 0 ? (
        <p>Analysez vos parties pour découvrir vos positions dangereuses.</p>
      ) : (
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
              data-serious={isDangerous(d) ? "true" : undefined}
              style={isDangerous(d) ? { backgroundColor: "#fbe0e0" } : undefined}
            >
              <div style={{ maxWidth: 240 }}>
                <Chessboard
                  options={{
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
                  <span title="Position dangereuse, à revoir" aria-label="position dangereuse, à revoir">
                    {" "}
                    ⚠
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
        </>
      )}
    </section>
  );
}
