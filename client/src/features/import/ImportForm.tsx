import { useEffect, useState, type FormEvent } from "react";
import { getSettings, saveSettings } from "../../api";
import { runImport } from "./runImport";
import { ImportSummary } from "./ImportSummary";
import type { ImportResult, ImportStatus, MonthRef, TimeControlCategory } from "../../types";

const CATEGORIES: TimeControlCategory[] = ["bullet", "blitz", "rapid", "daily"];

const label = (c: TimeControlCategory) => c[0].toUpperCase() + c.slice(1);

/** The current month as an <input type="month"> value (YYYY-MM). */
const thisMonth = () => new Date().toISOString().slice(0, 7);

/** Parses an <input type="month"> value (YYYY-MM) into a range bound. */
function parseMonth(value: string): MonthRef {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

/**
 * The chess.com import form: username, the month **range** to cover (both
 * bounds default to the current month, so the routine one-month import stays a
 * single click — US-9), and the time control categories, which apply to the
 * whole range. A range Import runs in the background, so the form reports
 * determinate progress counted in months while it runs; `onImported` lets the
 * parent refresh the Game list once it finishes.
 */
export function ImportForm({ onImported }: { onImported: () => void | Promise<void> }) {
  const [username, setUsername] = useState("");
  const [from, setFrom] = useState(thisMonth);
  const [to, setTo] = useState(thisMonth);
  const [categories, setCategories] = useState<Set<TimeControlCategory>>(new Set(CATEGORIES));
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportStatus | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setResult(null);
    try {
      const final = await runImport(
        {
          username,
          from: parseMonth(from),
          to: parseMonth(to),
          categories: CATEGORIES.filter((c) => categories.has(c)),
        },
        setProgress,
      );
      await onImported();
      setResult(final.result);
      setStatus(final.result?.message ?? null);
      // Remember the username for next time (best-effort).
      saveSettings(username).catch(() => {});
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setProgress(null);
    }
  };

  const running = progress?.running ?? false;

  return (
    <>
      <form aria-label="import" onSubmit={submit}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          Du
          <input type="month" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          Au
          <input type="month" value={to} onChange={(e) => setTo(e.target.value)} />
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
        <button type="submit" disabled={running}>
          Import
        </button>
      </form>

      {progress && (
        <p role="status" aria-label="import progress">
          {progress.done}/{progress.total} mois importés
        </p>
      )}

      {status && (
        <p role="status" aria-label="import status">
          {status}
        </p>
      )}

      {!running && result && <ImportSummary result={result} />}
    </>
  );
}
