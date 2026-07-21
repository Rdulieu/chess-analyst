import { useEffect, useState, type FormEvent } from "react";
import { importGames, getSettings, saveSettings } from "../../api";
import { ImportSummary } from "./ImportSummary";
import type { ImportResult, TimeControlCategory } from "../../types";

const CATEGORIES: TimeControlCategory[] = ["bullet", "blitz", "rapid", "daily"];

const label = (c: TimeControlCategory) => c[0].toUpperCase() + c.slice(1);

/** The current month as an <input type="month"> value (YYYY-MM). */
const thisMonth = () => new Date().toISOString().slice(0, 7);

/** Parses an <input type="month"> value (YYYY-MM) into [year, month]. */
function parseMonth(value: string): [number, number] {
  const [year, month] = value.split("-").map(Number);
  return [year, month];
}

/**
 * The chess.com import form: username, month (defaults to the current month),
 * and the time control categories to import. Runs the Import and reports status;
 * `onImported` lets the parent refresh the Game list once it succeeds.
 */
export function ImportForm({ onImported }: { onImported: () => void | Promise<void> }) {
  const [username, setUsername] = useState("");
  const [month, setMonth] = useState(thisMonth);
  const [categories, setCategories] = useState<Set<TimeControlCategory>>(new Set(CATEGORIES));
  const [status, setStatus] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  // Prefill from the remembered username (best-effort; a missing store is fine).
  useEffect(() => {
    getSettings()
      .then((s) => s.username && setUsername(s.username))
      .catch(() => {});
  }, []);

  const toggleCategory = (c: TimeControlCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const runImport = async (e: FormEvent) => {
    e.preventDefault();
    const [year, monthNumber] = parseMonth(month);
    setStatus("Importing…");
    setResult(null);
    setBusy(true);
    try {
      const imported = await importGames({
        username,
        year,
        month: monthNumber,
        categories: CATEGORIES.filter((c) => categories.has(c)),
      });
      await onImported();
      setStatus(imported.message ?? null);
      setResult(imported);
      // Remember the username for next time (best-effort).
      saveSettings(username).catch(() => {});
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
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

      {busy && <progress aria-label="import progress" />}

      {status && (
        <p role="status" aria-label="import status">
          {status}
        </p>
      )}

      {!busy && result && <ImportSummary result={result} />}
    </>
  );
}
