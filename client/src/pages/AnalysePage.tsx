import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchGame } from "../api";
import { GameViewer } from "../features/games/GameViewer";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { Game } from "../types";

/**
 * Analyse (`/analyse/:gameId`): reviews one Game on the interactive board. The
 * Game id comes from the route, so the page is reachable by direct URL/reload —
 * it loads its own Game rather than relying on the list screen's state.
 */
export function AnalysePage() {
  const { gameId } = useParams();
  const [game, setGame] = useState<Game | null>(null);

  const refresh = useCallback(async () => {
    if (!gameId) return;
    await fetchGame(Number(gameId))
      .then(setGame)
      .catch(() => setGame(null));
  }, [gameId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!game) return <p>Loading game…</p>;

  return (
    // Like every screen: one section, an accessible name and an `h2`. `wide`
    // because the board and its `Evaluation curve` are the densest thing the app
    // draws and would be cramped inside the reading column.
    <section aria-labelledby="analyse-heading" data-width="wide">
      <h2 id="analyse-heading">Analyse</h2>
      {/* The way into the Player's own reading of this Game (US-16a). Offered
          here because the reading route is Game-scoped: it is reached from a
          Game, never from the `Nav`. */}
      <p>
        <Link to={`/analyse/${game.id}/lecture`}>Écrire ma lecture de cette partie</Link>
      </p>
      <ErrorBoundary key={game.id}>
        <GameViewer game={game} onAnalyzed={refresh} />
      </ErrorBoundary>
    </section>
  );
}
