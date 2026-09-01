import { useEffect, useMemo, useState } from "react";
import { Board } from "../../components/Board";
import { parseGame } from "../../chess/history";
import { fetchGameAnnotations } from "../../api";
import { useAnalysisPass } from "../analysis/useAnalysisPass";
import { AnalysisPassStatus } from "../analysis/AnalysisPassStatus";
import { ReanalyseAction } from "../analysis/ReanalyseAction";
import { GameHeader } from "./GameHeader";
import { gameHeader } from "./gameHeader";
import { ReviewModeControl } from "../review/ReviewModeControl";
import { atLeastAnnotated, loadReviewMode, saveReviewMode } from "../review/reviewMode";
import { noteEngineShown, showsEngine } from "../personal/engineSeen";
import type { Game, GameRecap, MoveAnnotation } from "../../types";

/**
 * Shows one selected Game on the interactive board. When the Game has been
 * through the analysis pass (US-4), also fetches its per-Move annotations
 * (US-7 — severity glyph + Evaluation) and shows as much of them as the
 * `Review mode` asks for (CONTEXT.md): **Unaided by default** — a Game is opened
 * to be read, and the engine's verdict is something the Player asks for. The
 * chosen level is remembered, so it is chosen once and not on every Game.
 * For a not-yet-analyzed Game, the board is shown all the
 * same — a Game is explorable as soon as it is imported — with a scoped
 * "Analyser" action offered *above* it (US-7); `onAnalyzed` lets the parent
 * refresh the Game once the pass completes, so the annotations appear with no
 * manual reload.
 */
/**
 * How the confirmation names a Game: the two players and the date, which is what
 * the header above the board already says — destroying the wrong Game's analysis
 * by reflex is the risk the naming exists against.
 */
function describe(game: Game): string {
  const { sides, date } = gameHeader(game);
  return `${sides[0].name ?? "?"} — ${sides[1].name ?? "?"} (${date})`;
}

export function GameViewer({
  game,
  onAnalyzed,
}: {
  game: Game;
  onAnalyzed?: () => void | Promise<void>;
}) {
  const [annotations, setAnnotations] = useState<MoveAnnotation[] | null>(null);
  /** What this Game contributes — served with the annotations, from the same
   *  derivation the future aggregate folds (ADR-0017). */
  const [recap, setRecap] = useState<GameRecap | null>(null);
  /**
   * The level for **this** review. Seeded from the remembered choice, and written
   * back only when the Player themself picks one — the end-of-pass promotion below
   * moves this review without speaking for the Player's other Games.
   */
  const [mode, setMode] = useState(loadReviewMode);
  const { status, nothingToDo, blocked, run, acknowledge, running } = useAnalysisPass(game.profileId);
  /** Positions a pass on this Game would search — one per half-move, plus the
   *  starting one. Read from the PGN so the cost can be quoted before any
   *  analysis exists to count. */
  const positions = useMemo(() => parseGame(game.pgn).plies.length + 1, [game.pgn]);

  useEffect(() => {
    if (!game.analyzed) return;
    fetchGameAnnotations(game.id, game.profileId)
      .then((result) => {
        setAnnotations(result.plies);
        setRecap(result.recap);
      })
      .catch(() => {
        setAnnotations(null);
        setRecap(null);
      });
    // `game.profileId` belongs here: the annotations route is Profile-scoped now
    // (ADR-0014), so the Profile is part of what the request asks for.
  }, [game.id, game.analyzed, game.profileId]);

  const chooseMode = (next: typeof mode) => {
    setMode(next);
    saveReviewMode(next);
  };

  /**
   * The **provenance** of a future `Personal analysis` (US-16a): this Game had the
   * engine's findings put in front of the Player. Recorded here because this is
   * the screen that renders them — an intention is not something the Player saw,
   * so the record is made where the showing happens, and only when both halves
   * hold (a level above Unaided, on a Game with an analysis to show).
   *
   * It **labels** a later reading; it never claims to have prevented anyone from
   * looking, which is a promise this app cannot keep and does not make.
   */
  useEffect(() => {
    if (showsEngine({ analyzed: game.analyzed, mode })) noteEngineShown(game.id);
  }, [game.id, game.analyzed, mode]);

  const analyze = async (overwrite = false) => {
    // `overwrite` is the Player's confirmation travelling all the way to the
    // engine. Without it the server filters this Game out as already analyzed
    // and opens no pass — the confirmation would warn about a destruction that
    // never happens.
    await run([game.id], { overwrite });
    // The one exception to Unaided-by-default: the pass was asked for so there
    // would be something to look at, and finishing it with an identical screen
    // would make a successful pass indistinguishable from one that did nothing.
    // Only THIS review moves — the remembered level is left alone.
    setMode(atLeastAnnotated);
    await onAnalyzed?.();
  };

  return (
    // The screen's own `wide` column bounds this now (the Analyse `section` asks
    // for it): the `Evaluation curve` beside the board needs width to be a *time*
    // axis at all, and how much width is the stylesheet's call, not this
    // component's.
    <div>
      <GameHeader game={game} />
      {/* The Player reads their own Game the way they played it (CONTEXT.md → Board orientation). */}
      <Board
        pgn={game.pgn}
        orientation={game.playerColor}
        annotations={mode === "unaided" ? undefined : (annotations ?? undefined)}
        detailed={mode === "detailed"}
        recap={recap}
        // Handed to the board as controls rather than stacked above it: they
        // belong with the readout they govern, and every line above the diagram is
        // height the diagram does not get — which is why BOTH states go through
        // this slot. The not-yet-analysed block is the taller of the two, and
        // leaving it above the board was enough on its own to push the diagram's
        // bottom edge off the screen.
        controls={() => (
          <div>
            {game.analyzed ? (
              <ReviewModeControl mode={mode} onChange={chooseMode} />
            ) : (
              <p>Cette partie n'a pas encore été analysée.</p>
            )}
            {/*
              Offered in BOTH states now. An analysed Game used to lose the action
              altogether, which left the Player looking at an analysis they had no
              way to redo from where they were reading it.
            */}
            <ReanalyseAction
              analyzed={game.analyzed}
              gameName={describe(game)}
              // The Positions this Game's pass will search. Its own annotations
              // when they are loaded — one entry per Position — and the PGN's
              // half-moves otherwise, which is the same count.
              positions={annotations?.length ?? positions}
              running={running}
              // An analysed Game only reaches here past the confirmation, so the
              // overwrite is exactly the act the Player authorised.
              onAnalyze={() => analyze(game.analyzed)}
            />
            <AnalysisPassStatus
              status={status}
              nothingToDo={nothingToDo}
              blocked={blocked}
              onAcknowledge={acknowledge}
            />
          </div>
        )}
      />
    </div>
  );
}
