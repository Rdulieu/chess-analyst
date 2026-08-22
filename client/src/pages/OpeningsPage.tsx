import { useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchWeakOpenings } from "../api";
import { Tally } from "../components/Tally";
import { useLoaded } from "../features/load/useLoaded";
import { LoadFailure } from "../features/load/LoadFailure";
import { CADENCE_LABEL, type Profile, type Side, type WeakOpeningEntry } from "../types";

const SIDE_LABEL: Record<Side, string> = { white: "Blancs", black: "Noirs" };
const percent = (rate: number) => `${Math.round(rate * 100)} %`;

/** A `Weak opening` is highlighted when its `Win rate` is under 50% (CONTEXT.md). */
const isWeak = (o: WeakOpeningEntry) => o.winRate !== null && o.winRate < 0.5;

/**
 * Weak opening (`/openings`): every `Opening` **the current `Profile`** has
 * played — a repertoire belongs to one player (ADR-0014) — one row per
 * (opening, side, cadence) — name · ECO, side, cadence, games, the win/draw/loss
 * tally and the `Win rate` — sorted by game count descending (the server does
 * the sorting). Rows under a 50% `Win rate` are highlighted for review.
 *
 * A failed load says so and offers a retry; only a genuinely empty history shows
 * the invitation (`games-load-failure`).
 */
export function OpeningsPage({ profile }: { profile: Profile }) {
  const load = useCallback(() => fetchWeakOpenings(profile.id), [profile.id]);
  const openings = useLoaded(load, [profile.id]);

  return (
    // `wide`: six columns, one of which holds an `Opening` name past sixty
    // characters. Inside the reading column the five figure columns were pushed
    // out of sight.
    <section aria-labelledby="openings-heading" data-width="wide">
      <h2 id="openings-heading">Ouvertures</h2>

      {openings.state === "loading" && <p role="status">Chargement de vos ouvertures…</p>}

      {openings.state === "failed" && (
        <LoadFailure what="vos ouvertures" error={openings.error} onRetry={openings.retry} />
      )}

      {openings.state !== "loaded" ? null : openings.data.length === 0 ? (
        <p>
          Aucune partie pour <strong>{profile.username}</strong> —{" "}
          <Link to={`/profiles/${profile.id}`}>importez son historique</Link> pour voir ses
          ouvertures.
        </p>
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
              {openings.data.map((o) => (
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
