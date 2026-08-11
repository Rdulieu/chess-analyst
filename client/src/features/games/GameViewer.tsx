import { useEffect, useState } from "react";
import { Board } from "../../components/Board";
import { fetchGameAnnotations } from "../../api";
import { runAnalysis } from "../analysis/runAnalysis";
import type { AnalysisStatus, Game, MoveAnnotation } from "../../types";

/**
 * Shows one selected Game on the interactive board. When the Game has been
 * through the analysis pass (US-4), also fetches its per-Move annotations
 * (US-7 — severity glyph + Evaluation) and shows/hides them via a toggle
 * (on by default). For a not-yet-analyzed Game, the board is shown all the
 * same — a Game is explorable as soon as it is imported — with a scoped
 * "Analyser" action offered *above* it (US-7); `onAnalyzed` lets the parent
 * refresh the Game once the pass completes, so the annotations appear with no
 * manual reload.
 */
export function GameViewer({ game, onAnalyzed }: { game: Game; onAnalyzed?: () => void | Promise<void> }) {
  const [annotations, setAnnotations] = useState<MoveAnnotation[] | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [status, setStatus] = useState<AnalysisStatus | null>(null);

  useEffect(() => {
    if (!game.analyzed) return;
    fetchGameAnnotations(game.id)
      .then((result) => setAnnotations(result.plies))
      .catch(() => setAnnotations(null));
  }, [game.id, game.analyzed]);

  const analyze = async () => {
    await runAnalysis([game.id], setStatus);
    setStatus(null);
    await onAnalyzed?.();
  };

  return (
    <div style={{ maxWidth: 480 }}>
      {game.analyzed ? (
        <label>
          <input
            type="checkbox"
            checked={showAnnotations}
            onChange={() => setShowAnnotations((v) => !v)}
          />
          {" "}Afficher les annotations
        </label>
      ) : (
        <div>
          <p>Cette partie n'a pas encore été analysée.</p>
          <button type="button" onClick={analyze} disabled={status?.running ?? false}>
            Analyser cette partie
          </button>
          {status && (
            <p role="status" aria-label="progression de l'analyse">
              {status.done}/{status.total} parties analysées
            </p>
          )}
        </div>
      )}
      <Board pgn={game.pgn} annotations={showAnnotations ? (annotations ?? undefined) : undefined} />
    </div>
  );
}
