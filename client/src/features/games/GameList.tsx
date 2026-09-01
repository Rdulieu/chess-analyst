import { Link } from "react-router-dom";
import { CADENCE_LABEL, READING_STATE_LABEL, RESULT_LABEL } from "../../types";
import type { Game } from "../../types";

/**
 * The retained Games, as a **table**: one row per Game, one fact per cell, so
 * the Player sweeps a column (every date, every cadence) instead of reading
 * eighty rows one by one. Each row carries a selection checkbox (to pick Games
 * for the analysis pass) and **links** to the Game's Analyse page; an "analysée"
 * badge marks a Game once it has been analyzed (US-4).
 *
 * The opponent's name is an **anchor** (US-23, D2), and it is the only element of
 * the app whose *type* this story had to change: it navigated by program from a
 * `<button>`, so middle-click, "open in a new tab" and the status bar all did
 * nothing. It stays **bare** — no action marker: it navigates, and styling it as
 * a control would put a slab in every one of fifty-four rows.
 *
 * Most recent first — but that order is the server's (`listGames`), not this
 * component's: the list arrives ordered and is rendered as it comes.
 */
export function GameList({
  games,
  selectedIds,
  onToggleSelect,
}: {
  games: Game[];
  selectedIds: Set<number>;
  onToggleSelect: (id: number) => void;
}) {
  return (
    // Six columns of `nowrap` cells outgrow a narrow content column, and when
    // they do it is the CONTAINER that scrolls, never the page (`_tables.scss`).
    // Left to the page, the document scrolled sideways at 900px and the table
    // overhung its column by 130px at 1440px — measured on the running app,
    // where jsdom could never have seen it.
    //
    // The container lives HERE rather than in the page, unlike /stats and
    // /openings whose tables are built inline in theirs: this table belongs to
    // the component, so the guarantee travels with it.
    <div data-scroll="x">
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
            {/* The Player's own reading, in its own column — the state the Player
                sweeps to choose the next Game to work on (US-16a). Beside the
                engine's `analysée`, never merged into it: one is the machine's
                work, the other is theirs. */}
            <th scope="col">Lecture</th>
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
                <Link to={`/analyse/${g.id}`}>{g.opponent}</Link>
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
              <td>
                {/* In WORDS. A tint alone could only ever mean "something", never
                    "started" as against "sealed" (ADR-0013) — and those two are
                    exactly what the Player needs told apart: one is where they
                    resume, the other where they are done. A Game with no reading
                    says so plainly rather than leaving an empty cell to be read
                    as a rendering fault. */}
                <span data-reading={g.reading ?? "none"}>
                  {READING_STATE_LABEL[g.reading ?? "none"]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
