import { useState, type FormEvent } from "react";
import { runImport } from "./runImport";
import { ImportSummary } from "./ImportSummary";
import {
  CADENCE_LABEL,
  TIME_CONTROL_CATEGORIES,
  platformLabel,
  type ImportResult,
  type ImportStatus,
  type MonthRef,
  type Profile,
  type TimeControlCategory,
} from "../../types";

const CATEGORIES = TIME_CONTROL_CATEGORIES;

const label = (c: TimeControlCategory) => CADENCE_LABEL[c];

/** The current month as an <input type="month"> value (YYYY-MM). */
const thisMonth = () => new Date().toISOString().slice(0, 7);

/** Parses an <input type="month"> value (YYYY-MM) into a range bound. */
function parseMonth(value: string): MonthRef {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

/** Beyond this many months, the Player is asked to confirm before it starts. */
const CONFIRM_ABOVE_MONTHS = 24;

/** How many months a range covers, both bounds included. */
const monthSpan = (from: MonthRef, to: MonthRef) =>
  (to.year - from.year) * 12 + (to.month - from.month) + 1;

/**
 * The import form of ONE `Profile`: the month **range** to cover (both
 * bounds default to the current month, so the routine one-month import stays a
 * single click — US-9), and the time control categories, which apply to the
 * whole range. A range Import runs in the background, so the form reports
 * determinate progress counted in months while it runs; `onImported` lets the
 * page refresh its counters once it finishes.
 *
 * There is **no username field**: the account to fetch is the Profile's own,
 * already validated against its `Platform` when the Profile was created. Typing
 * it was the only way one account's Games could ever land under another's
 * Profile (US-11), so the guarantee is the field's absence, not a check.
 *
 * The form **names the site** it will fetch from, read off the Profile: no
 * Player should ever be one click away from importing from the wrong one
 * (US-12). There is no source to choose here — the Platform belongs to the
 * Profile and was settled at its creation (ADR-0014).
 */
export function ImportForm({
  profile,
  onImported,
}: {
  profile: Profile;
  onImported: () => void | Promise<void>;
}) {
  const profileId = profile.id;
  const [from, setFrom] = useState(thisMonth);
  const [to, setTo] = useState(thisMonth);
  const [categories, setCategories] = useState<Set<TimeControlCategory>>(new Set(CATEGORIES));
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportStatus | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const toggleCategory = (c: TimeControlCategory) =>
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const range = { from: parseMonth(from), to: parseMonth(to) };

    // The server deliberately caps nothing — rebuilding a whole history in one
    // Import is a supported use. The risk worth catching is the typo (2004 for
    // 2024), and it is caught here, where it is made.
    const months = monthSpan(range.from, range.to);
    if (months > CONFIRM_ABOVE_MONTHS && !confirm(`Cette plage couvre ${months} mois. Continuer ?`)) {
      return;
    }

    setStatus(null);
    setResult(null);
    try {
      const final = await runImport(
        {
          profileId,
          ...range,
          categories: CATEGORIES.filter((c) => categories.has(c)),
        },
        setProgress,
      );
      await onImported();
      setResult(final.result);
      setStatus(final.result?.message ?? null);
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
        {/* Which site this Import will ask, in words: the Platform of the
            Profile, never a choice made here. */}
        <p data-part="platform">
          Import depuis <strong>{platformLabel(profile.platform)}</strong> — compte{" "}
          <strong>{profile.username}</strong>
        </p>
        {/* Label and field are siblings, the label associated by `for`: that is
            what lets the label sit above its field and every field share one
            height, instead of the text and the control being one inline run. */}
        <div>
          <label htmlFor="import-from">Du</label>
          <input
            id="import-from"
            type="month"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="import-to">Au</label>
          <input id="import-to" type="month" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <fieldset>
          <legend>Time control categories</legend>
          {CATEGORIES.map((c) => (
            <label key={c}>
              <input type="checkbox" checked={categories.has(c)} onChange={() => toggleCategory(c)} />
              {label(c)}
            </label>
          ))}
        </fieldset>
        {/* The primary action, named as such on the element rather than left to
            whichever button happens to be styled first. */}
        <button type="submit" data-action="primary" disabled={running}>
          Import
        </button>
      </form>

      {progress && (
        <p role="status" aria-label="import progress">
          {progress.done}/{progress.total} mois importés
        </p>
      )}

      {/* The wait is its own line, in words: a paused Import must never be read
          as a frozen one, nor as a month that failed. */}
      {progress?.waiting && (
        <p role="status" aria-label="attente de la plateforme" data-part="waiting">
          {progress.waiting}
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
