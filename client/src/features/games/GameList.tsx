import type { Game } from "../../types";

/** The retained Games; selecting one opens its Analyse page. */
export function GameList({
  games,
  onSelect,
}: {
  games: Game[];
  onSelect: (game: Game) => void;
}) {
  return (
    <ul aria-label="games">
      {games.map((g) => (
        <li key={g.id}>
          <button type="button" onClick={() => onSelect(g)}>
            vs {g.opponent} · {g.result} · {g.date} · {g.timeControlCategory}
          </button>
        </li>
      ))}
    </ul>
  );
}
