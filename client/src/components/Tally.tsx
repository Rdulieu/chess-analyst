/**
 * Player-relative win/draw/loss tally, **spelled out for assistive technology**
 * (screen readers get "victoires / nulles / défaites", not just "V · N · D").
 * Shared by every results view — the global stats page and the Weak opening
 * page — so the wording lives in one place.
 */
export function Tally({ win, draw, loss }: { win: number; draw: number; loss: number }) {
  return (
    <span aria-label={`${win} victoires, ${draw} nulles, ${loss} défaites`}>
      {win} V · {draw} N · {loss} D
    </span>
  );
}
