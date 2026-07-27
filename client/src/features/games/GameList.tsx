import type { Game } from "../../types";

/**
 * The retained Games. Each row carries a selection checkbox (to pick Games for
 * the analysis pass) and a button that opens the Game's Analyse page; an
 * "analysée" badge marks a Game once it has been analyzed (US-4). The badge uses
 * an inline style plus a textual/checkmark cue — the app ships no stylesheet and
 * highlights must not rely on colour alone.
 */
export function GameList({
  games,
  onSelect,
  selectedIds,
  onToggleSelect,
}: {
  games: Game[];
  onSelect: (game: Game) => void;
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}) {
  return (
    <ul aria-label="games">
      {games.map((g) => (
        <li key={g.id}>
          <input
            type="checkbox"
            aria-label={`sélectionner la partie vs ${g.opponent}`}
            checked={selectedIds.has(g.id)}
            onChange={() => onToggleSelect(g.id)}
          />
          <button type="button" onClick={() => onSelect(g)}>
            vs {g.opponent} · {g.result} · {g.date} · {g.timeControlCategory}
          </button>
          {g.analyzed && (
            <span aria-label="analysée" style={{ marginLeft: "0.5rem", fontWeight: "bold" }}>
              ✓ analysée
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
