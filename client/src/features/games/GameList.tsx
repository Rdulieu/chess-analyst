import type { Game } from "../../types";

/** The retained Games, selectable; the current selection is marked. */
export function GameList({
  games,
  selected,
  onSelect,
}: {
  games: Game[];
  selected: Game | null;
  onSelect: (game: Game) => void;
}) {
  return (
    <ul aria-label="games">
      {games.map((g) => (
        <li key={g.id}>
          <button
            type="button"
            aria-current={selected?.id === g.id ? "true" : undefined}
            onClick={() => onSelect(g)}
          >
            vs {g.opponent} · {g.result} · {g.date} · {g.timeControlCategory}
          </button>
        </li>
      ))}
    </ul>
  );
}
