import { useEffect, useState } from "react";
import { fetchGames, importGames } from "./api";
import { Board } from "./components/Board";
import type { Game, TimeControlCategory } from "./types";

const CATEGORIES: TimeControlCategory[] = ["bullet", "blitz", "rapid", "daily"];

const label = (c: TimeControlCategory) => c[0].toUpperCase() + c.slice(1);

/** The current month as an <input type="month"> value (YYYY-MM). */
const thisMonth = () => new Date().toISOString().slice(0, 7);

/** Parses an <input type="month"> value (YYYY-MM) into [year, month]. */
function parseMonth(value: string): [number, number] {
  const [year, month] = value.split("-").map(Number);
  return [year, month];
}

export function App() {
  const [games, setGames] = useState<Game[] | null>(null);
  const [username, setUsername] = useState("");
  const [month, setMonth] = useState(thisMonth);
  const [categories, setCategories] = useState<Set<TimeControlCategory>>(new Set(CATEGORIES));
  const [status, setStatus] = useState<string | null>(null);
  const [selected, setSelected] = useState<Game | null>(null);

  useEffect(() => {
    fetchGames()
      .then(setGames)
      .catch(() => setGames([]));
  }, []);

  const toggleCategory = (c: TimeControlCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const runImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const [year, monthNumber] = parseMonth(month);
    setStatus("Importing…");
    try {
      const result = await importGames({
        username,
        year,
        month: monthNumber,
        categories: CATEGORIES.filter((c) => categories.has(c)),
      });
      setGames(await fetchGames());
      setStatus(
        result.message ?? `Imported ${result.imported}, ${result.alreadyPresent} already present.`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import failed.");
    }
  };

  return (
    <main>
      <h1>chess-analyst</h1>

      <form aria-label="import" onSubmit={runImport}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          Month
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <fieldset>
          <legend>Time control categories</legend>
          {CATEGORIES.map((c) => (
            <label key={c}>
              <input type="checkbox" checked={categories.has(c)} onChange={() => toggleCategory(c)} />
              {label(c)}
            </label>
          ))}
        </fieldset>
        <button type="submit">Import</button>
      </form>

      {status && (
        <p role="status" aria-label="import status">
          {status}
        </p>
      )}

      {games && games.length === 0 && (
        <p>No games yet — import your chess.com history to get started.</p>
      )}

      {games && games.length > 0 && (
        <ul aria-label="games">
          {games.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                aria-current={selected?.id === g.id ? "true" : undefined}
                onClick={() => setSelected(g)}
              >
                vs {g.opponent} · {g.result} · {g.date} · {g.timeControlCategory}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div style={{ maxWidth: 480 }}>
          <Board pgn={selected.pgn} />
        </div>
      )}
    </main>
  );
}
