import type { ImportResult, MonthlyImport, TimeControlCategory } from "../../types";

const CATEGORIES: TimeControlCategory[] = ["bullet", "blitz", "rapid", "daily"];
const label = (c: TimeControlCategory) => c[0].toUpperCase() + c.slice(1);
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const yyyymm = ({ year, month }: MonthlyImport["month"]) =>
  `${year}-${String(month).padStart(2, "0")}`;

/**
 * One month of the range. The month's own contribution is shown, and a month
 * chess.com could not answer for says so **in words** as well as in style: the
 * tint (`--tint-fail`, applied by the stylesheet on `data-failed`) can never be
 * the only cue, because a failed month must stay distinguishable from a month
 * the Player was inactive in, which reads as a plain zero.
 */
function MonthLine({ line }: { line: MonthlyImport }) {
  const failed = line.failure !== undefined;
  return (
    <li aria-label={yyyymm(line.month)} data-failed={failed ? "true" : undefined}>
      {yyyymm(line.month)} —{" "}
      {failed
        ? `échec : ${line.failure}`
        : `${line.imported} importée${line.imported === 1 ? "" : "s"}, ${line.alreadyPresent} déjà présente${line.alreadyPresent === 1 ? "" : "s"}`}
    </li>
  );
}

/** Post-import summary: what chess.com had, what was retained, and how the Player did. */
export function ImportSummary({ result }: { result: ImportResult }) {
  const { totalFetched, imported, alreadyPresent, byCategory, results, months } = result;
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
        <span aria-label={count(results.win, "win", "wins")}>{results.win} W</span>
        {" · "}
        <span aria-label={count(results.draw, "draw", "draws")}>{results.draw} D</span>
        {" · "}
        <span aria-label={count(results.loss, "loss", "losses")}>{results.loss} L</span>
      </p>
      {months.length > 0 && (
        <ul aria-label="by month">
          {months.map((line) => (
            <MonthLine key={yyyymm(line.month)} line={line} />
          ))}
        </ul>
      )}
    </section>
  );
}
