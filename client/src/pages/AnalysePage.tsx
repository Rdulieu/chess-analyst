import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
    <ErrorBoundary key={game.id}>
      <GameViewer game={game} onAnalyzed={refresh} />
    </ErrorBoundary>
  );
}
