import { useCallback, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { fetchStats, fetchStatsDamage, fetchStatsReplay } from "../api";
import { Tally } from "../components/Tally";
import { MaterialBandTable } from "../features/stats/MaterialBandTable";
import { PhaseDamageTable } from "../features/stats/PhaseDamageTable";
import { PhaseResultTable } from "../features/stats/PhaseResultTable";
import { SignatureTable } from "../features/stats/SignatureTable";
import { useLoaded } from "../features/load/useLoaded";
import { LoadFailure } from "../features/load/LoadFailure";
import { TableSkeleton } from "../features/load/TableSkeleton";
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
 * with games, the win/draw/loss tally and the `Win rate`) — followed by the four
 * derived tables. Everything is aggregated on the fly server-side over that
 * Profile's Games alone (ADR-0014), so the `Win rate` is that player's win rate
 * and nobody else's, and switching Profile restarts all three reads.
 *
 * **The page arrives in pieces, cheapest first** (US-32 slice 08). It used to
 * make one request and show nothing until the slowest fold in it was done — 18 s
 * on a 186-Game `Profile`, 53 s on the 1 806-Game one — while the results it
 * opens with had been ready in under a millisecond the whole time. Now:
 *
 * - the **summary** paints the page;
 * - the **damage** table follows, folded from stored `Evaluation`s;
 * - the **replay** group (configurations, bands, results by `Phase`) follows
 *   that — three tables and one request, because they share one PGN replay and
 *   splitting them would replay every PGN three times (slice 06).
 *
 * **Sequenced, not fired together, and that is a measurement rather than a
 * taste.** Node is single-threaded and both folds only yield every 25 Games, so
 * launched at once they slow each other down: on `DudulSmash` the damage table
 * lands at **8.5 s** when it goes first and **15.5 s** when it runs alongside
 * the replay — which itself finishes no sooner for the company (16.8 s against
 * 17.7 s). Shortest job first, therefore, and the reader gets a table earlier
 * for it. The gate releases when the damage read **settles**, success or
 * failure, so a broken block never strands the next one.
 *
 * Each block owns its three states, and a failure in one does **not** wipe the
 * others: `LoadFailure` and its retry apply per block. An empty history is the
 * one case where the expensive reads are never even asked for — the summary
 * already knows there is nothing to fold.
 */
export function StatsPage({ profile }: { profile: Profile }) {
  const loadStats = useCallback(() => fetchStats(profile.id), [profile.id]);
  const loadDamage = useCallback(() => fetchStatsDamage(profile.id), [profile.id]);
  const loadReplay = useCallback(() => fetchStatsReplay(profile.id), [profile.id]);

  const stats = useLoaded(loadStats, [profile.id]);

  // Nothing to fold over an empty history, and nothing to show for it either:
  // the invitation below is the whole answer, and firing the two folds would be
  // two requests asked in order to be thrown away.
  const hasGames = stats.state === "loaded" && stats.data.total.games > 0;

  const damage = useLoaded(loadDamage, [profile.id], hasGames);
  const replay = useLoaded(loadReplay, [profile.id], hasGames && damage.state !== "loading");

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

          {/* The three tables of the replay group, in the order they had when
              they all came in one object — the split changed when they arrive,
              not where they sit.

              The corpus table of Endgame configurations (US-32, ADR-0036) sits
              under the results it is NOT a breakdown of: its currency is the
              same — the Game's result — but a Game counts once per configuration
              crossed, so its rows overlap and nothing here sums to the Total.
              The bands read the same crossings on a second axis, right under the
              column they explain. */}
          {replay.state === "failed" ? (
            <LoadFailure
              what="vos configurations de finale"
              error={replay.error}
              onRetry={replay.retry}
            />
          ) : replay.state === "loading" ? (
            <>
              <TableSkeleton
                id="signatures-heading"
                heading="Configurations de finale"
                awaiting="Configurations de finale"
                columns={["Configuration", "± matériel", "Parties", "Résultats", "Win rate"]}
                rows={3}
              />
              <TableSkeleton
                id="material-bands-heading"
                heading="Déséquilibre matériel et win rate"
                awaiting="Win rate par bande de matériel"
                columns={["Bande", "Parties", "Résultats", "Win rate"]}
                rows={3}
              />
              <TableSkeleton
                id="phase-results-heading"
                heading="Où vos parties se décident"
                awaiting="Parties par phase de fin"
                // Three Phases, always: the shape is the real shape here, not a
                // guess dressed up as one.
                columns={["Phase de fin", "Parties", "Part", "Résultats", "Win rate"]}
                rows={3}
              />
            </>
          ) : (
            <>
              <SignatureTable table={replay.data.signatures} />
              <MaterialBandTable table={replay.data.materialBands} />
              <PhaseResultTable table={replay.data.phaseResults} />
            </>
          )}

          {/* The same `Phase` axis read twice, in two currencies, and NEVER
              folded into one (ADR-0036's amendment): results over the whole
              history, damage over the analysed Games only. They disagree on this
              base, and the screen names the disagreement rather than smoothing
              it — the damage table carries that line, because it is the one that
              owes the reader both denominators.

              It is the first of the two folds to land, and it shows the moment
              it does. The one sentence it needs the results table for — the
              disagreement between the two readings — waits for that table on its
              own, rather than holding the whole block back for it. */}
          {damage.state === "failed" ? (
            <LoadFailure
              what="vos dégâts par phase"
              error={damage.error}
              onRetry={damage.retry}
            />
          ) : damage.state === "loaded" ? (
            <PhaseDamageTable
              table={damage.data.phaseDamage}
              results={replay.state === "loaded" ? replay.data.phaseResults : undefined}
            />
          ) : (
            <TableSkeleton
              id="phase-damage-heading"
              heading="Où tombent vos dégâts"
              awaiting="Dégâts par phase"
              columns={[
                "Phase",
                "Phase dominante dans",
                "Parties l'ayant atteinte",
                "Part moyenne des dégâts",
                "Médiane",
              ]}
              rows={3}
            />
          )}
        </>
      )}
    </section>
  );
}
