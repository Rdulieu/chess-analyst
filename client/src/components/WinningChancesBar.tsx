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
      style={{ display: "flex", height: 8, width: "100%" }}
    >
      <div style={{ width: `${white}%`, backgroundColor: "#eee" }} />
      <div style={{ width: `${black}%`, backgroundColor: "#333" }} />
    </div>
  );
}
