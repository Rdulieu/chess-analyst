import type { Game } from "../../types";

/**
 * How much of the imported history has been through the `Analysis pass`, stated
 * above the Game list (US-8). The per-Game badge answers "is *this* one done?";
 * this answers "where do I stand overall?" — which otherwise required scanning
 * every row, and which is true whenever the page is open, not only just after a
 * pass.
 *
 * Derived from the Games the page already loaded: no extra request, no endpoint.
 *
 * **Labelled**, because it sits a few pixels from the last pass's summary and
 * the two used to share one shape ("6 parties · 3 analysées" against "1 partie ·
 * 3 positions évaluées ✓"), which read as one correcting the other. Each figure
 * now says what it describes, rather than relying on where it sits — which also
 * survives a screen reader's sequential reading, and any later reshuffle of the
 * page.
 */
export function AnalyzedCount({ games }: { games: Game[] }) {
  const analyzed = games.filter((game) => game.analyzed).length;

  return (
    <p>
      Historique : {analyzed} {analyzed > 1 ? "parties analysées" : "partie analysée"} sur{" "}
      {games.length}
    </p>
  );
}
