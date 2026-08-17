import type { Game } from "../../types";

/**
 * The retained Games. Each row carries a selection checkbox (to pick Games for
 * the analysis pass) and a button that opens the Game's Analyse page; an
 * "analysée" badge marks a Game once it has been analyzed (US-4). The badge is a
 * pill styled from the sheet (`--tint-ok` and its own ink) plus a
 * textual/checkmark cue — a highlight must not rely on colour alone.
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
        // Three named parts on every row — the state part stays even when the
        // Game is not analysed, so the columns line up down a list of eighty
        // Games instead of shifting on each analysed entry.
        <li key={g.id}>
          <span data-part="selection">
            <input
              type="checkbox"
              aria-label={`sélectionner la partie vs ${g.opponent}`}
              checked={selectedIds.has(g.id)}
              onChange={() => onToggleSelect(g.id)}
            />
          </span>
          <span data-part="description">
            <button type="button" onClick={() => onSelect(g)}>
              vs {g.opponent} · {g.result} · {g.date} · {g.timeControlCategory}
            </button>
          </span>
          <span data-part="state">
            {g.analyzed && (
              // A bordered pill rather than bold text: in a 54-row list the bold
              // was easy to miss. The pill's tint, ink and border come from the
              // stylesheet; the checkmark and the word carry the meaning, so the
              // tint is never the only cue.
              <span aria-label="analysée">✓ analysée</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
