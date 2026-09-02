import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGames } from "../api";
import { useAnalysisPass } from "../features/analysis/useAnalysisPass";
import { AnalysisPassStatus } from "../features/analysis/AnalysisPassStatus";
import { GameList } from "../features/games/GameList";
import { AnalyzedCount } from "../features/games/AnalyzedCount";
import { useLoaded } from "../features/load/useLoaded";
import { LoadFailure } from "../features/load/LoadFailure";
import { platformLabel, type Profile } from "../types";

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
    // `wide`: six columns, and the last of them — `État`, carrying the "analysée"
    // badge — was pushed out of sight inside the 72ch reading column (788px of
    // table for 659px of room). `/openings` carries the same attribute for the
    // same reason. The table still scrolls in its own container; this only gives
    // it the room to not need to.
    <section aria-labelledby="games-heading" data-width="wide">
      <h2 id="games-heading">Mes parties</h2>

      {games.state === "loading" && <p role="status">Chargement de vos parties…</p>}

      {games.state === "failed" && (
        <LoadFailure what="vos parties" error={games.error} onRetry={games.retry} />
      )}

      {games.state === "loaded" && games.data.length === 0 && (
        // Named, and pointing at the Profile's own page: importing is an
        // operation ON a Profile, and this Profile is the one to act on.
        <p>
          Aucune partie pour <strong>{profile.username}</strong> —{" "}
          <Link to={`/profiles/${profile.id}#import`}>importez son historique</Link> pour
          commencer.
        </p>
      )}

      {games.state === "loaded" && games.data.length > 0 && (
        <>
          <AnalyzedCount games={games.data} />

          {/* The way back to the Import (US-23, D1). It lived only in the empty
              state, so a Profile that already had a history had no way to add to
              it. Importing is an operation ON a Profile (ADR-0014) and its form
              does not move: it is the DOOR that navigates, and the `#import`
              fragment asks for the form rather than merely for the page. */}
          {/* ONE row for the two actions (US-23, F1). They were stacked siblings,
              spending two rows on two short labels; the row's own rule — spacing,
              and wrapping rather than overflowing — has existed since US-23-05,
              and what was missing was that both actions be in it. Same shape as
              the header of `/profiles`, where the two doors already share one. */}
          <p data-part="actions">
            <Link
              to={`/profiles/${profile.id}#import`}
              data-action=""
              // Label first, then the Profile: a voice-control Player must be
              // able to say what they read (WCAG 2.5.3).
              aria-label={`Importer mes parties — ${profile.username} (${platformLabel(profile.platform)})`}
            >
              Importer mes parties
            </Link>
            <button type="button" onClick={analyze} disabled={selected.size === 0 || running}>
              Analyser la sélection
            </button>
          </p>

          <AnalysisPassStatus status={status} nothingToDo={nothingToDo} onAcknowledge={acknowledge} />

          <GameList
            games={games.data}
            selectedIds={selected}
            onToggleSelect={toggleSelect}
          />
        </>
      )}
    </section>
  );
}
