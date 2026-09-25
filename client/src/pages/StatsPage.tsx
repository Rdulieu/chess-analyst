import { useCallback, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { fetchStats } from "../api";
import { Tally } from "../components/Tally";
import { MaterialBandTable } from "../features/stats/MaterialBandTable";
import { PhaseDamageTable } from "../features/stats/PhaseDamageTable";
import { PhaseResultTable } from "../features/stats/PhaseResultTable";
import { SignatureTable } from "../features/stats/SignatureTable";
import { useLoaded } from "../features/load/useLoaded";
import { LoadFailure } from "../features/load/LoadFailure";
import {
  CADENCE_LABEL,
  TIME_CONTROL_CATEGORIES,
  type Profile,
  type Side,
  type StatsBucket,
} from "../types";

const CADENCES = TIME_CONTROL_CATEGORIES.map((key) => ({ key, label: CADENCE_LABEL[key] }));

const SIDES: { key: Side; label: string }[] = [
  { key: "white", label: "Blancs" },
  { key: "black", label: "Noirs" },
];

const games = (n: number) => `${n} ${n > 1 ? "parties" : "partie"}`;
const percent = (rate: number) => `${Math.round(rate * 100)} %`;

/**
 * One results row: its label as the row header, then games, the tally and the
 * `Win rate` each in its own cell — one concern per cell, so a column can be
 * scanned (the rate cell stays empty when there are no games).
 */
function Row({ label, bucket, id }: { label: string; bucket: StatsBucket; id?: string }) {
  return (
    <tr>
      <th scope="row" id={id}>
        {label}
      </th>
      <td>{games(bucket.games)}</td>
      <td>
        <Tally win={bucket.win} draw={bucket.draw} loss={bucket.loss} />
      </td>
      <td>{bucket.winRate !== null ? percent(bucket.winRate) : null}</td>
    </tr>
  );
}

/**
 * A breakdown as a row group: its own header row names it, and the group is
 * labelled by that header — which is what lets the Player tell, for any row,
 * which breakdown it belongs to.
 */
function Group({ id, header, children }: { id: string; header: string; children: ReactNode }) {
  return (
    <tbody aria-labelledby={id}>
      <tr>
        <th scope="colgroup" colSpan={4} id={id}>
          {header}
        </th>
      </tr>
      {children}
    </tbody>
  );
}

/**
 * Stats (`/stats`): **the current `Profile`'s** results summary — a Total plus
 * breakdowns by time control category and by the side the Player played (each
 * with games, the win/draw/loss tally and the `Win rate`). Aggregated on the fly
 * server-side over that Profile's Games alone (ADR-0014), so the `Win rate` is
 * that player's win rate and nobody else's.
 *
 * A failed load says so and offers a retry; only a genuinely empty history shows
 * the invitation (`games-load-failure`).
 */
export function StatsPage({ profile }: { profile: Profile }) {
  const load = useCallback(() => fetchStats(profile.id), [profile.id]);
  const stats = useLoaded(load, [profile.id]);

  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading">Stats</h2>

      {stats.state === "loading" && <p role="status">Chargement de vos statistiques…</p>}

      {stats.state === "failed" && (
        <LoadFailure what="vos statistiques" error={stats.error} onRetry={stats.retry} />
      )}

      {stats.state !== "loaded" ? null : stats.data.total.games === 0 ? (
        <p>
          Aucune partie pour <strong>{profile.username}</strong> —{" "}
          <Link to={`/profiles/${profile.id}`}>importez son historique</Link> pour voir ses
          statistiques.
        </p>
      ) : (
        // One table rather than three: the Total, the cadences and the sides are
        // row groups of the same results, so a column can be scanned across all
        // of them. The former "Par cadence" / "Par côté" sub-headings are now
        // the groups' header rows, and carry the accessible names the two lists
        // used to carry.
        <>
        <div data-scroll="x">
          <table aria-label="résultats">
            <thead>
              <tr>
                <th scope="col">Ensemble</th>
                <th scope="col">Parties</th>
                <th scope="col">Résultats</th>
                <th scope="col">Win rate</th>
              </tr>
            </thead>

            <tbody aria-labelledby="stats-total">
              <Row id="stats-total" label="Total" bucket={stats.data.total} />
            </tbody>

            <Group id="stats-by-cadence" header="Par cadence">
              {CADENCES.map(({ key, label }) => (
                <Row key={key} label={label} bucket={stats.data.byCategory[key]} />
              ))}
            </Group>

            <Group id="stats-by-side" header="Par côté">
              {SIDES.map(({ key, label }) => (
                <Row key={key} label={label} bucket={stats.data.bySide[key]} />
              ))}
            </Group>
          </table>
        </div>

        {/* The corpus table of Endgame configurations (US-32, ADR-0036). It
            sits under the results it is NOT a breakdown of: its currency is the
            same — the Game's result — but a Game counts once per configuration
            crossed, so its rows overlap and nothing here sums to the Total. */}
        <SignatureTable table={stats.data.signatures} />

        {/* The same crossings on a second axis — bands of points rather than
            configurations — and the requester's own comparison (2026-09-25).
            It sits right under the table whose `± matériel` column it explains,
            and it carries the mitigation that keeps that column honest: the
            band situates, it does not predict. */}
        <MaterialBandTable table={stats.data.materialBands} />

        {/* The same `Phase` axis read twice, in two currencies, and NEVER
            folded into one (ADR-0036's amendment): results over the whole
            history, damage over the analysed Games only. They disagree on this
            base, and the screen names the disagreement rather than smoothing
            it — the damage table carries that line, because it is the one that
            owes the reader both denominators. */}
        <PhaseResultTable table={stats.data.phaseResults} />
        <PhaseDamageTable table={stats.data.phaseDamage} results={stats.data.phaseResults} />
        </>
      )}
    </section>
  );
}
