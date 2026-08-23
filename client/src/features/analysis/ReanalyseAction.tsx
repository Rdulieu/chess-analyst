import { useState } from "react";
import { rebuildMinutes } from "./rebuildCost";

/**
 * Starting — and **re-**starting — the `Analysis pass` from the Analyse page,
 * which until now only offered to analyse a Game that had never been analysed:
 * once a Game had its `Evaluation`s there was no way to redo them from the screen
 * where the Player is actually looking at them.
 *
 * **Overwriting an existing analysis is destroying engine time**, not refetching
 * data that can be fetched again (ADR-0015), so it is a deliberate act. The
 * confirmation **names the Game**, says **what is lost** and **what rebuilding it
 * costs**, with **Cancel as the primary action**.
 *
 * It follows the pattern already in the app — deleting a `Profile` confirms with
 * an in-page `role="alertdialog"` card that names what it destroys. Same class of
 * act, same idiom. Deliberately **not** a native browser dialog: the one used
 * elsewhere warns about a *duration*, this one warns about a *destruction*, and
 * only a card can name the cost.
 *
 * Cancelling touches nothing: no pass opened, no `Evaluation` lost. And no path
 * here ever starts a run on its own — an engine run is always the Player's act.
 */
export function ReanalyseAction({
  analyzed,
  gameName,
  positions,
  running,
  onAnalyze,
}: {
  /** Whether there is an existing analysis to overwrite. */
  analyzed: boolean;
  /** How the confirmation names the Game — destroying the wrong one by reflex is the risk. */
  gameName: string;
  /** Positions to search again, for the cost quoted. */
  positions: number;
  running: boolean;
  onAnalyze: () => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);

  const start = () => {
    setConfirming(false);
    void onAnalyze();
  };

  return (
    <div data-part="reanalyse">
      <button
        type="button"
        disabled={running}
        // An unanalysed Game has nothing to overwrite, so it is not asked about:
        // a confirmation with nothing to lose only teaches the Player to dismiss
        // confirmations.
        onClick={() => (analyzed ? setConfirming(true) : start())}
      >
        {analyzed ? "Réanalyser cette partie" : "Analyser cette partie"}
      </button>

      {confirming && (
        <div role="alertdialog" aria-label="confirmer la réanalyse" className="card">
          <p>
            Réanalyser <strong>{gameName}</strong> ? Son analyse actuelle sera{" "}
            <strong>écrasée</strong> : les évaluations existantes seront perdues, et seul le moteur
            peut les reconstruire — comptez environ{" "}
            <strong>{rebuildMinutes(positions)} minute{rebuildMinutes(positions) > 1 ? "s" : ""}</strong>.
          </p>
          <p data-part="actions">
            <button type="button" onClick={start}>
              Réanalyser
            </button>
            {/* Primary, because the safe choice is the one a reflex should land on. */}
            <button type="button" data-action="primary" onClick={() => setConfirming(false)}>
              Annuler
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
