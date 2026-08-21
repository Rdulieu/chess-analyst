import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchGames } from "../api";
import { useAnalysisPass } from "../features/analysis/useAnalysisPass";
import { AnalysisPassStatus } from "../features/analysis/AnalysisPassStatus";
import { GameList } from "../features/games/GameList";
import { AnalyzedCount } from "../features/games/AnalyzedCount";
import { useLoaded } from "../features/load/useLoaded";
import { LoadFailure } from "../features/load/LoadFailure";
import type { Profile } from "../types";

/**
 * Mes parties (`/`): **the current `Profile`'s** Game list and the engine-
 * analysis pass (US-4). The Profile arrives as a parameter (ADR-0014) — the
 * page is about one player, and says so by asking for one.
 *
 * Importing lives on the Profile's own page (US-11). The Player selects Games
 * (checkboxes) and starts an analysis; a determinate progress readout shows
 * while it runs, and each analyzed Game gets an "analysée" badge once done.
 *
 * Three load outcomes, kept apart: a failed load says so and offers a retry, a
 * Profile with no Game invites an import, and neither can stand in for the
 * other (`games-load-failure`).
 */
export function GamesPage({ profile }: { profile: Profile }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { status, nothingToDo, run, acknowledge, running } = useAnalysisPass(profile.id);
  const navigate = useNavigate();

  const load = useCallback(() => fetchGames(profile.id), [profile.id]);
  const games = useLoaded(load, [profile.id]);

  const toggleSelect = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const analyze = async () => {
    await run([...selected]);
    setSelected(new Set());
    games.reload();
  };

  return (
    <section aria-labelledby="games-heading">
      <h2 id="games-heading">Mes parties</h2>

      {games.state === "loading" && <p role="status">Chargement de vos parties…</p>}

      {games.state === "failed" && (
        <LoadFailure what="vos parties" error={games.error} onRetry={games.retry} />
      )}

      {games.state === "loaded" && games.data.length === 0 && (
        // Named, and pointing at the Profile's own page: importing is an
        // operation ON a Profile, and this Profile is the one to act on.
        <p>
          Aucune partie pour <strong>{profile.username}</strong> — <Link to={`/profiles/${profile.id}`}>importez son historique</Link>{" "}
          pour commencer.
        </p>
      )}

      {games.state === "loaded" && games.data.length > 0 && (
        <>
          <AnalyzedCount games={games.data} />

          <button type="button" onClick={analyze} disabled={selected.size === 0 || running}>
            Analyser la sélection
          </button>

          <AnalysisPassStatus status={status} nothingToDo={nothingToDo} onAcknowledge={acknowledge} />

          <GameList
            games={games.data}
            onSelect={(g) => navigate(`/analyse/${g.id}`)}
            selectedIds={selected}
            onToggleSelect={toggleSelect}
          />
        </>
      )}
    </section>
  );
}
