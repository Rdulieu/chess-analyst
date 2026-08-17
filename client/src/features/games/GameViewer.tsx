import { useEffect, useState } from "react";
import { Board } from "../../components/Board";
import { fetchGameAnnotations } from "../../api";
import { useAnalysisPass } from "../analysis/useAnalysisPass";
import { AnalysisPassStatus } from "../analysis/AnalysisPassStatus";
import { GameHeader } from "./GameHeader";
import type { Game, MoveAnnotation } from "../../types";

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
  const { status, nothingToDo, run, acknowledge, running } = useAnalysisPass();

  useEffect(() => {
    if (!game.analyzed) return;
    fetchGameAnnotations(game.id)
      .then((result) => setAnnotations(result.plies))
      .catch(() => setAnnotations(null));
  }, [game.id, game.analyzed]);

  const analyze = async () => {
    await run([game.id]);
    await onAnalyzed?.();
  };

  return (
    // The screen's own `wide` column bounds this now (the Analyse `section` asks
    // for it): the `Evaluation curve` beside the board needs width to be a *time*
    // axis at all, and how much width is the stylesheet's call, not this
    // component's.
    <div>
      <GameHeader game={game} />
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
          <button type="button" onClick={analyze} disabled={running}>
            Analyser cette partie
          </button>
          <AnalysisPassStatus status={status} nothingToDo={nothingToDo} onAcknowledge={acknowledge} />
        </div>
      )}
      {/* The Player reads their own Game the way they played it (CONTEXT.md → Board orientation). */}
      <Board
        pgn={game.pgn}
        orientation={game.playerColor}
        annotations={showAnnotations ? (annotations ?? undefined) : undefined}
      />
    </div>
  );
}
