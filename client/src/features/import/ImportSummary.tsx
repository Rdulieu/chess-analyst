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

/**
 * What a month brought in, spelled out. **Zero takes the singular in French** —
 * `0 déjà présente`, not `0 déjà présentes` — which is why the test is `<= 1`
 * rather than `=== 1`; the latter made every zero read plural, and put a
 * singular and a plural in one breath (`1 importée, 0 déjà présentes`).
 */
const plural = (n: number) => (n <= 1 ? "" : "s");
const contribution = (line: MonthlyImport) =>
  `${line.imported} importée${plural(line.imported)}, ${line.alreadyPresent} déjà présente${plural(line.alreadyPresent)}`;

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
 * **Two words, for two different states**, and the difference is what the Player
 * already has in hand:
 *
 * - `incomplet` — some Games arrived and the month is not finished. They have
 *   part of it.
 * - `échec` — nothing arrived at all. They have none of it.
 *
 * Collapsing the two under one word would throw away something they can act on,
 * and both stay distinct from the **plain zero** of a month they were simply
 * inactive in. Which is also why the contribution is printed **only when
 * something arrived**: `0 importée` beside either word would hand back the very
 * ambiguity these cues remove — a zero means "you did not play", a failure means
 * "we do not know", and the two must not be made to look alike.
 */
function MonthLine({ line }: { line: MonthlyImport }) {
  const failed = line.failure !== undefined;
  const arrived = line.imported > 0 || line.alreadyPresent > 0;
  return (
    <li aria-label={yyyymm(line.month)} data-failed={failed ? "true" : undefined}>
      {yyyymm(line.month)} —{" "}
      {failed
        ? arrived
          ? `${contribution(line)} · incomplet : ${line.failure}`
          : `échec : ${line.failure}`
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
