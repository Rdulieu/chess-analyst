import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchGames } from "../api";
import { ImportForm } from "../features/import/ImportForm";
import { GameList } from "../features/games/GameList";
import type { Game } from "../types";

/**
 * Mes parties (`/`): the import form and the Game list. Selecting a Game
 * navigates to its Analyse page rather than rendering a viewer inline.
 */
export function GamesPage() {
  const [games, setGames] = useState<Game[] | null>(null);
  const navigate = useNavigate();

  const refresh = async () => setGames(await fetchGames());

  useEffect(() => {
    fetchGames()
      .then(setGames)
      .catch(() => setGames([]));
  }, []);

  return (
    <>
      <ImportForm onImported={refresh} />

      {games && games.length === 0 && (
        <p>No games yet — import your chess.com history to get started.</p>
      )}

      {games && games.length > 0 && (
        <GameList games={games} onSelect={(g) => navigate(`/analyse/${g.id}`)} />
      )}
    </>
  );
}
