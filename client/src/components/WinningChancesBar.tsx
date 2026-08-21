/**
 * A White/Black winning-chances balance bar for the currently-viewed Position
 * (US-7). Driven by White-relative winning chances (0–100), not raw
 * centipawns, so it saturates consistently with how severities are already
 * classified. The split is also spelled out as text (the `aria-label`), so
 * the signal never relies on color alone.
 */
export function WinningChancesBar({ whiteWinChances }: { whiteWinChances: number }) {
  const white = Math.round(whiteWinChances);
  const black = 100 - white;

  return (
    // Named for the stylesheet, which holds the bar's shape and its frame — the
    // border being what keeps White's light share detachable from a dark ground,
    // since the shares themselves refuse to follow the theme (ADR-0013).
    <div
      data-bar="winning-chances"
      role="img"
      aria-label={`Blancs ${white}% — Noirs ${black}%`}
    >
      {/* The widths are data and the colours are tokens, both inline because
          each share's size is computed per Position. `--white-share` and
          `--black-share` are declared once, outside the dark block: a colour
          that says "White" does not say "background". */}
      <div style={{ width: `${white}%`, backgroundColor: "var(--white-share)" }} />
      <div style={{ width: `${black}%`, backgroundColor: "var(--black-share)" }} />
    </div>
  );
}
