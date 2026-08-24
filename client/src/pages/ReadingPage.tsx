import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchGame } from "../api";
import { PersonalReading } from "../features/personal/PersonalReading";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { Game } from "../types";

/**
 * The reading route (`/analyse/:gameId/lecture`): where the Player writes their
 * own reading of one Game, unaided (`Personal analysis`, CONTEXT.md).
 *
 * Outside the `Nav`, exactly like `/analyse/:gameId`: it is *Game-scoped* — one
 * reaches it from a Game, never from a global menu — so the navigation is
 * untouched. The Game id comes from the route, so the page survives a reload and
 * a direct URL.
 */
export function ReadingPage() {
  const { gameId } = useParams();
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!gameId) return;
    let live = true;
    fetchGame(Number(gameId))
      .then((result) => live && setGame(result))
      .catch(() => live && setGame(null));
    return () => {
      live = false;
    };
  }, [gameId]);

  if (!game) return <p>Loading game…</p>;

  return (
    // `wide` like Analyse: the board and the reading controls beside it are the
    // densest thing this app draws.
    <section aria-labelledby="reading-heading" data-width="wide">
      <h2 id="reading-heading">Ma lecture</h2>
      {/* The way back to the engine's side of the same Game. Named as what it is:
          the Player leaves their own reading to go and see what was found. */}
      <p>
        <Link to={`/analyse/${game.id}`}>Retour à l'analyse de cette partie</Link>
      </p>
      <ErrorBoundary key={game.id}>
        <PersonalReading game={game} profileId={game.profileId} />
      </ErrorBoundary>
    </section>
  );
}
