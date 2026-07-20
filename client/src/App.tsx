import { useEffect, useState } from "react";
import { Chessboard } from "react-chessboard";
import { fetchGame, fetchGames } from "./api";
import { startingPosition } from "./chess/history";
import type { Game } from "./types";

export function App() {
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const games = await fetchGames();
        if (games.length === 0) {
          if (!cancelled) setError("No game available yet.");
          return;
        }
        const full = await fetchGame(games[0].id);
        if (!cancelled) setGame(full);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load the game.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!game) return <p>Loading…</p>;

  const position = startingPosition(game.pgn);

  return (
    <main>
      <h1>chess-analyst</h1>
      <section aria-label="game details">
        <p>
          vs {game.opponent} · {game.result} · {game.date} · {game.timeControlCategory}
        </p>
      </section>
      <div style={{ maxWidth: 480 }}>
        <Chessboard options={{ id: "game-board", position, allowDragging: false }} />
      </div>
    </main>
  );
}
