import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchGame } from "../api";
import { GameViewer } from "../features/games/GameViewer";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { READING_STATE_LABEL } from "../types";
import type { Game, ReadingState } from "../types";

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

  const reading: ReadingState = game.reading ?? "none";

  return (
    // Like every screen: one section, an accessible name and an `h2`. `wide`
    // because the board and its `Evaluation curve` are the densest thing the app
    // draws and would be cramped inside the reading column.
    <section aria-labelledby="analyse-heading" data-width="wide">
      <h2 id="analyse-heading">Analyse</h2>
      {/* The way into the Player's own reading of this Game, and where that
          reading stands (US-16a). Offered here because the reading route is
          Game-scoped: it is reached from a Game, never from the `Nav`. */}
      <p data-part="reading-entry">
        <Link to={`/analyse/${game.id}/lecture`}>{READING_ENTRY[reading]}</Link>{" "}
        {/* The state in words beside the way in: "resume" and "see" are different
            invitations, and a Player who cannot tell a started reading from a
            sealed one does not know which they are about to do. */}
        <span data-reading={reading}>{READING_STATE_LABEL[reading]}</span>
      </p>
      <ErrorBoundary key={game.id}>
        <GameViewer game={game} onAnalyzed={refresh} />
      </ErrorBoundary>
    </section>
  );
}

/**
 * How the way in is named, per state. Three different invitations, because they
 * are three different acts: beginning a reading, coming back to an unfinished
 * one, and looking at one that is closed.
 */
const READING_ENTRY: Record<ReadingState, string> = {
  none: "Écrire ma lecture de cette partie",
  open: "Reprendre ma lecture de cette partie",
  sealed: "Voir ma lecture scellée de cette partie",
};
