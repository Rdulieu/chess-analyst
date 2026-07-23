import { useEffect, useState } from "react";
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

/** One results line: games · tally · Win rate (rate omitted when there are no games). */
function Line({ bucket }: { bucket: StatsBucket }) {
  return (
    <>
      {games(bucket.games)} · <Tally win={bucket.win} draw={bucket.draw} loss={bucket.loss} />
      {bucket.winRate !== null && <> · {percent(bucket.winRate)}</>}
    </>
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
        <>
          <p aria-label="total">
            <strong>Total</strong> — <Line bucket={stats.total} />
          </p>

          <h3>Par cadence</h3>
          <ul aria-label="par cadence">
            {CADENCES.map(({ key, label }) => (
              <li key={key}>
                {label} : <Line bucket={stats.byCategory[key]} />
              </li>
            ))}
          </ul>

          <h3>Par côté</h3>
          <ul aria-label="par côté">
            {SIDES.map(({ key, label }) => (
              <li key={key}>
                {label} : <Line bucket={stats.bySide[key]} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
