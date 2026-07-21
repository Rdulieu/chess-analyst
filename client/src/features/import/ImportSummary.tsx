import type { ImportResult, TimeControlCategory } from "../../types";

const CATEGORIES: TimeControlCategory[] = ["bullet", "blitz", "rapid", "daily"];
const label = (c: TimeControlCategory) => c[0].toUpperCase() + c.slice(1);

/** Post-import summary: what chess.com had, what was retained, and how the Player did. */
export function ImportSummary({ result }: { result: ImportResult }) {
  const { totalFetched, imported, alreadyPresent, byCategory, results } = result;
  const played = CATEGORIES.filter((c) => byCategory[c] > 0);

  return (
    <section aria-label="import summary">
      <p>
        {totalFetched} game{totalFetched === 1 ? "" : "s"} fetched — {imported} imported,{" "}
        {alreadyPresent} already present.
      </p>
      {played.length > 0 && (
        <ul aria-label="by category">
          {played.map((c) => (
            <li key={c}>
              {label(c)}: {byCategory[c]}
            </li>
          ))}
        </ul>
      )}
      <p aria-label="results">
        {results.win} W · {results.draw} D · {results.loss} L
      </p>
    </section>
  );
}
