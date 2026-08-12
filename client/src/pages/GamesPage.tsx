import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchGames } from "../api";
import { useAnalysisPass } from "../features/analysis/useAnalysisPass";
import { AnalysisPassStatus } from "../features/analysis/AnalysisPassStatus";
import { ImportForm } from "../features/import/ImportForm";
import { GameList } from "../features/games/GameList";
import { AnalyzedCount } from "../features/games/AnalyzedCount";
import type { Game } from "../types";

/**
 * Mes parties (`/`): the import form, the Game list, and the engine-analysis
 * pass (US-4). The Player selects Games (checkboxes) and starts an analysis; a
 * determinate progress readout shows while it runs (polling the status), and
 * each analyzed Game gets an "analysée" badge once done. Selecting a Game's row
 * button navigates to its Analyse page.
 */
export function GamesPage() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { status, nothingToDo, run, acknowledge, running } = useAnalysisPass();
  const navigate = useNavigate();

  const refresh = async () => setGames(await fetchGames());

  useEffect(() => {
    fetchGames()
      .then(setGames)
      .catch(() => setGames([]));
  }, []);

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
    await refresh();
  };

  return (
    <>
      <ImportForm onImported={refresh} />

      {games && games.length === 0 && (
        <p>No games yet — import your chess.com history to get started.</p>
      )}

      {games && games.length > 0 && (
        <>
          <AnalyzedCount games={games} />

          <button type="button" onClick={analyze} disabled={selected.size === 0 || running}>
            Analyser la sélection
          </button>

          <AnalysisPassStatus status={status} nothingToDo={nothingToDo} onAcknowledge={acknowledge} />

          <GameList
            games={games}
            onSelect={(g) => navigate(`/analyse/${g.id}`)}
            selectedIds={selected}
            onToggleSelect={toggleSelect}
          />
        </>
      )}
    </>
  );
}
