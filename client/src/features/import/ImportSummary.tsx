import {
  CADENCE_LABEL,
  TIME_CONTROL_CATEGORIES,
  type ImportResult,
  type MonthlyImport,
  type TimeControlCategory,
} from "../../types";

const CATEGORIES = TIME_CONTROL_CATEGORIES;
const label = (c: TimeControlCategory) => CADENCE_LABEL[c];
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const yyyymm = ({ year, month }: MonthlyImport["month"]) =>
  `${year}-${String(month).padStart(2, "0")}`;

/** What a month brought in, spelled out. */
const contribution = (line: MonthlyImport) =>
  `${line.imported} importée${line.imported === 1 ? "" : "s"}, ${line.alreadyPresent} déjà présente${line.alreadyPresent === 1 ? "" : "s"}`;

/**
 * One month of the range. The month's own contribution is shown, and a month the
 * Platform could not answer for says so **in words** as well as in style: the
 * tint (`--tint-fail`, applied by the stylesheet on `data-failed`) can never be
 * the only cue, because a failed month must stay distinguishable from a month
 * the Player was inactive in, which reads as a plain zero.
 *
 * A month can be **both**: a stream cut mid-month keeps the Games that arrived
 * (US-17), so the month is incomplete *and* has a contribution. It then says
 * both — showing only the failure made the line deny Games the headline had
 * already counted, and a Player adding the lines up could not reach the total.
 *
 * But the contribution is shown **only when something arrived**. Printing
 * `0 importées` beside `échec` would hand back the very ambiguity the failure
 * cue removes: a zero means "you did not play", a failure means "we do not
 * know", and the two must not be made to look alike.
 */
function MonthLine({ line }: { line: MonthlyImport }) {
  const failed = line.failure !== undefined;
  const arrived = line.imported > 0 || line.alreadyPresent > 0;
  return (
    <li aria-label={yyyymm(line.month)} data-failed={failed ? "true" : undefined}>
      {yyyymm(line.month)} —{" "}
      {failed
        ? `${arrived ? `${contribution(line)} · ` : ""}échec : ${line.failure}`
        : contribution(line)}
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
