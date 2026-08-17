import { useEffect, useState, type ReactNode } from "react";
import { fetchStats } from "../api";
import { Tally } from "../components/Tally";
import type { Side, StatsBucket, StatsSummary, TimeControlCategory } from "../types";

const CADENCES: { key: TimeControlCategory; label: string }[] = [
  { key: "bullet", label: "Bullet" },
  { key: "blitz", label: "Blitz" },
  { key: "rapid", label: "Rapid" },
  { key: "daily", label: "Daily" },
];

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
 * Stats (`/stats`): the history-wide results summary — a Total plus breakdowns
 * by time control category and by the side the Player played (each with games,
 * the win/draw/loss tally and the `Win rate`). Aggregated on the fly server-side
 * (`GET /api/stats`). With no imported Games, shows an invitation only.
 */
export function StatsPage() {
  const [stats, setStats] = useState<StatsSummary | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading">Stats</h2>

      {!stats ? null : stats.total.games === 0 ? (
        <p>Aucune partie importée — importez votre historique pour voir vos statistiques.</p>
      ) : (
        // One table rather than three: the Total, the cadences and the sides are
        // row groups of the same results, so a column can be scanned across all
        // of them. The former "Par cadence" / "Par côté" sub-headings are now
        // the groups' header rows, and carry the accessible names the two lists
        // used to carry.
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
              <Row id="stats-total" label="Total" bucket={stats.total} />
            </tbody>

            <Group id="stats-by-cadence" header="Par cadence">
              {CADENCES.map(({ key, label }) => (
                <Row key={key} label={label} bucket={stats.byCategory[key]} />
              ))}
            </Group>

            <Group id="stats-by-side" header="Par côté">
              {SIDES.map(({ key, label }) => (
                <Row key={key} label={label} bucket={stats.bySide[key]} />
              ))}
            </Group>
          </table>
        </div>
      )}
    </section>
  );
}
