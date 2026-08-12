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
            <span
              aria-label="analysée"
              // A bordered pill rather than bold text: in a 54-row list the bold
              // was easy to miss. Inline — the app ships no stylesheet — and the
              // checkmark + word carry the meaning, so the tint is never the
              // only cue.
              style={{
                marginLeft: "0.5rem",
                padding: "0.05rem 0.4rem",
                border: "1px solid #2e7d32",
                borderRadius: "0.75rem",
                backgroundColor: "#e8f5e9",
                color: "#1b5e20",
                fontWeight: "bold",
                fontSize: "0.85em",
                whiteSpace: "nowrap",
              }}
            >
              ✓ analysée
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
