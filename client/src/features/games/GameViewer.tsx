import { useEffect, useState } from "react";
import { Board } from "../../components/Board";
import { fetchGameAnnotations } from "../../api";
import type { Game, MoveAnnotation } from "../../types";

/**
 * Shows one selected Game on the interactive board. When the Game has been
 * through the analysis pass (US-4), also fetches its per-Move annotations
 * (US-7 — severity glyph + Evaluation) and shows/hides them via a toggle
 * (on by default).
 */
export function GameViewer({ game }: { game: Game }) {
  const [annotations, setAnnotations] = useState<MoveAnnotation[] | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);

  useEffect(() => {
    if (!game.analyzed) return;
    fetchGameAnnotations(game.id)
      .then((result) => setAnnotations(result.plies))
      .catch(() => setAnnotations(null));
  }, [game.id, game.analyzed]);

  return (
    <div style={{ maxWidth: 480 }}>
      {game.analyzed && (
        <label>
          <input
            type="checkbox"
            checked={showAnnotations}
            onChange={() => setShowAnnotations((v) => !v)}
          />
          {" "}Afficher les annotations
        </label>
      )}
      <Board pgn={game.pgn} annotations={showAnnotations ? (annotations ?? undefined) : undefined} />
    </div>
  );
}
