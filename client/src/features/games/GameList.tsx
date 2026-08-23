import { CADENCE_LABEL, RESULT_LABEL } from "../../types";
import type { Game } from "../../types";

/**
 * The retained Games, as a **table**: one row per Game, one fact per cell, so
 * the Player sweeps a column (every date, every cadence) instead of reading
 * eighty rows one by one. Each row carries a selection checkbox (to pick Games
 * for the analysis pass) and opens the Game's Analyse page; an "analysée" badge
 * marks a Game once it has been analyzed (US-4).
 *
 * Most recent first — but that order is the server's (`listGames`), not this
 * component's: the list arrives ordered and is rendered as it comes.
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
    <table aria-label="parties">
      <thead>
        <tr>
          {/* Unnamed on purpose: every checkbox below already says which Game it
              selects, so a header word here would only repeat it. */}
          <th scope="col" />
          <th scope="col">Date</th>
          <th scope="col">Adversaire</th>
          <th scope="col">Résultat</th>
          <th scope="col">Cadence</th>
          <th scope="col">État</th>
        </tr>
      </thead>
      <tbody>
        {games.map((g) => (
          <tr key={g.id}>
            <td>
              <input
                type="checkbox"
                aria-label={`sélectionner la partie vs ${g.opponent}`}
                checked={selectedIds.has(g.id)}
                onChange={() => onToggleSelect(g.id)}
              />
            </td>
            <td>{g.date}</td>
            <td>
              <button type="button" onClick={() => onSelect(g)}>
                {g.opponent}
              </button>
            </td>
            <td>{RESULT_LABEL[g.result]}</td>
            <td>{CADENCE_LABEL[g.timeControlCategory]}</td>
            <td>
              {g.analyzed && (
                // A bordered pill rather than bold text: in a 54-row list the
                // bold was easy to miss. The pill's tint, ink and border come
                // from the stylesheet; the checkmark and the word carry the
                // meaning, so the tint is never the only cue.
                <span aria-label="analysée">✓ analysée</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
