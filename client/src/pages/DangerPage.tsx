import { useEffect, useState } from "react";
import { Chessboard } from "react-chessboard";
import { fetchDangerPositions } from "../api";
import type { DangerEntry } from "../types";

const percent = (rate: number) => `${Math.round(rate * 100)} %`;

/** A `Danger position` is highlighted at a 50%+ serious-error proportion (CONTEXT.md). */
const isDangerous = (d: DangerEntry) => d.proportion >= 0.5;

/** A 4-field `Danger position` FEN, padded to a full FEN for board rendering (halfmove/fullmove are irrelevant to the diagram). */
const boardFen = (fen: string) => `${fen} 0 1`;

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
        <ul aria-label="positions dangereuses">
          {dangers.map((d, i) => (
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
                    allowDragging: false,
                    showAnimations: false,
                  }}
                />
              </div>
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
      )}
    </section>
  );
}
