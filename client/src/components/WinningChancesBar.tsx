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
    <div
      role="img"
      aria-label={`Blancs ${white}% — Noirs ${black}%`}
      style={{
        display: "flex",
        height: 8,
        width: "100%",
        // The border is what keeps White's light share detachable from a dark
        // ground: the shares themselves refuse to follow the theme, so the
        // frame has to do that work instead (ADR-0013).
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
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
