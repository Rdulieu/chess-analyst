import { useEffect, useState } from "react";
import { fetchWeakOpenings } from "../api";
import { Tally } from "../components/Tally";
import type { Side, TimeControlCategory, WeakOpeningEntry } from "../types";

const SIDE_LABEL: Record<Side, string> = { white: "Blancs", black: "Noirs" };
const CADENCE_LABEL: Record<TimeControlCategory, string> = {
  bullet: "Bullet",
  blitz: "Blitz",
  rapid: "Rapid",
  daily: "Daily",
};

const percent = (rate: number) => `${Math.round(rate * 100)} %`;

/** A `Weak opening` is highlighted when its `Win rate` is under 50% (CONTEXT.md). */
const isWeak = (o: WeakOpeningEntry) => o.winRate !== null && o.winRate < 0.5;

/**
 * Weak opening (`/openings`): every `Opening` the Player has played, one row per
 * (opening, side, cadence) — name · ECO, side, cadence, games, the win/draw/loss
 * tally and the `Win rate` — sorted by game count descending (the server does
 * the sorting). Rows under a 50% `Win rate` are highlighted for review. With no
 * imported Games, shows an invitation only.
 */
export function OpeningsPage() {
  const [openings, setOpenings] = useState<WeakOpeningEntry[] | null>(null);

  useEffect(() => {
    fetchWeakOpenings()
      .then(setOpenings)
      .catch(() => setOpenings(null));
  }, []);

  return (
    <section aria-labelledby="openings-heading">
      <h2 id="openings-heading">Ouvertures</h2>

      {!openings ? null : openings.length === 0 ? (
        <p>Aucune partie importée — importez votre historique pour voir vos ouvertures.</p>
      ) : (
        // Six columns of figures: the table gets its own scroll container so a
        // narrow window scrolls the table, never the page.
        <div data-scroll="x">
          <table aria-label="ouvertures">
            <thead>
              <tr>
                <th scope="col">Ouverture</th>
                <th scope="col">Côté</th>
                <th scope="col">Cadence</th>
                <th scope="col">Parties</th>
                <th scope="col">Résultats</th>
                <th scope="col">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {openings.map((o) => (
                <tr
                  key={`${o.eco}-${o.side}-${o.cadence}`}
                  // The row states that it is weak; the stylesheet tints it (the
                  // review tint and its own ink). The "à revoir ⚠" marker below
                  // is the cue that survives any perception of colour.
                  data-weak={isWeak(o) ? "true" : undefined}
                >
                  <td>
                    {o.openingName} · {o.eco}
                  </td>
                  <td>{SIDE_LABEL[o.side]}</td>
                  <td>{CADENCE_LABEL[o.cadence]}</td>
                  <td>{o.games}</td>
                  <td>
                    <Tally win={o.win} draw={o.draw} loss={o.loss} />
                  </td>
                  <td>
                    {o.winRate !== null ? percent(o.winRate) : null}
                    {isWeak(o) && (
                      <span
                        title="Ouverture faible, à revoir"
                        aria-label="ouverture faible à revoir"
                      >
                        {" "}
                        ⚠
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
