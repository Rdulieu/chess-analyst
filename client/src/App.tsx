import { useEffect, useState } from "react";
import { fetchGames } from "./api";
import { Board } from "./components/Board";
import type { Game } from "./types";

export function App() {
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const games = await fetchGames();
        if (cancelled) return;
        if (games.length === 0) {
          setError("No game available yet.");
          return;
        }
        setGame(games[0]);
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

  return (
    <main>
      <h1>chess-analyst</h1>
      <section aria-label="game details">
        <p>
          vs {game.opponent} · {game.result} · {game.date} · {game.timeControlCategory}
        </p>
      </section>
      <div style={{ maxWidth: 480 }}>
        <Board pgn={game.pgn} />
      </div>
    </main>
  );
}
