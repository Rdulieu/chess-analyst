import type { Game } from "../../types";

/**
 * How much of the imported history has been through the `Analysis pass`, stated
 * above the Game list (US-8). The per-Game badge answers "is *this* one done?";
 * this answers "where do I stand overall?" — which otherwise required scanning
 * every row, and which is true whenever the page is open, not only just after a
 * pass.
 *
 * Derived from the Games the page already loaded: no extra request, no endpoint.
 */
export function AnalyzedCount({ games }: { games: Game[] }) {
  const analyzed = games.filter((game) => game.analyzed).length;

  return (
    <p>
      {games.length} {games.length > 1 ? "parties" : "partie"} · {analyzed} analysée
      {analyzed > 1 ? "s" : ""}
    </p>
  );
}
