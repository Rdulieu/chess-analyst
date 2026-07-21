import { useEffect, useState } from "react";
import { fetchGames } from "./api";
import { ImportForm } from "./features/import/ImportForm";
import { GameList } from "./features/games/GameList";
import { GameViewer } from "./features/games/GameViewer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import type { Game } from "./types";

export function App() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [selected, setSelected] = useState<Game | null>(null);

  const refresh = async () => setGames(await fetchGames());

  useEffect(() => {
    fetchGames()
      .then(setGames)
      .catch(() => setGames([]));
  }, []);

  return (
    <main>
      <h1>chess-analyst</h1>

      <ImportForm onImported={refresh} />

      {games && games.length === 0 && (
        <p>No games yet — import your chess.com history to get started.</p>
      )}

      {games && games.length > 0 && (
        <GameList games={games} selected={selected} onSelect={setSelected} />
      )}

      {selected && (
        <ErrorBoundary key={selected.id}>
          <GameViewer game={selected} />
        </ErrorBoundary>
      )}
    </main>
  );
}
