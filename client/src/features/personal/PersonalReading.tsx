import { useCallback, useEffect, useState } from "react";
import { Board } from "../../components/Board";
import { GameHeader } from "../games/GameHeader";
import { fetchPersonalAnalysis, savePersonalMark } from "../../api";
import { DeclaredSeverityControl } from "./DeclaredSeverityControl";
import { playersOwnPly } from "./plies";
import type { DeclaredSeverity, Game, PersonalAnalysis } from "../../types";

/**
 * The reading of one Game — the Player's own work, written down (`Personal
 * analysis`, CONTEXT.md).
 *
 * **Blind by nature, not by setting.** It renders `Board` *without* its engine
 * props (`annotations`, `detailed`, `recap`), so there is no state of this screen
 * in which an `Evaluation`, an advantage bar, a curve, a severity glyph or a
 * `Best line` can appear. That is why this is a separate route rather than a mode
 * of the Analyse page: it **neither reads nor writes the `Review mode`**, so
 * nothing has to betray "the choice is remembered" to keep the exercise honest.
 *
 * What the app does **not** claim: that it prevented the Player from looking.
 * It cannot — another tab is a click away — so it labels a reading (slice 04)
 * rather than certifying it. The glossary refused the name *Blind mode* for
 * exactly this reason.
 *
 * No engine time is owed: a Game is readable, and annotable, the moment it is
 * imported.
 */
export function PersonalReading({ game, profileId }: { game: Game; profileId: number }) {
  const [reading, setReading] = useState<PersonalAnalysis | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetchPersonalAnalysis(game.id, profileId)
      .then((result) => live && setReading(result))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [game.id, profileId]);

  /**
   * Writes one verdict and keeps what came back. The server answers the **whole**
   * reading, so the screen never has to reconstruct the state it just produced —
   * and the reading is saved as it goes, which is what lets the Player close the
   * app mid-Game and lose nothing.
   */
  const pose = useCallback(
    async (ply: number, declaredSeverity: DeclaredSeverity) => {
      // Shown at once, so posing thirty verdicts never waits on the network; the
      // answer replaces it, and a failure is said rather than swallowed.
      setReading((current) => current && withMark(current, ply, { declaredSeverity }));
      await savePersonalMark(game.id, profileId, ply, { declaredSeverity })
        .then(setReading)
        .catch(() => setFailed(true));
    },
    [game.id, profileId],
  );

  if (failed) return <p role="alert">La lecture de cette partie n'a pas pu être chargée.</p>;
  if (!reading) return <p>Chargement de ma lecture…</p>;

  return (
    <div>
      <GameHeader game={game} />
      <Board
        pgn={game.pgn}
        // The Player reads their own Game the way they played it (CONTEXT.md →
        // Board orientation).
        orientation={game.playerColor}
        // No `annotations`, no `detailed`, no `recap` — deliberately, and this is
        // the whole guarantee this screen can honestly make. `Board`'s engine
        // props were already optional; this is the second caller they were
        // optional for.
        controls={(ply) => (
          <div data-part="reading-controls">
            <DeclaredSeverityControl
              ply={ply}
              posed={reading.marks.find((m) => m.ply === ply)?.declaredSeverity ?? null}
              playersOwnMove={playersOwnPly(ply, game.playerColor)}
              onPose={(severity) => void pose(ply, severity)}
            />
          </div>
        )}
      />
    </div>
  );
}

/** The reading with one ply's mark replaced — the optimistic echo of a write. */
function withMark(
  reading: PersonalAnalysis,
  ply: number,
  patch: { declaredSeverity: DeclaredSeverity },
): PersonalAnalysis {
  const existing = reading.marks.find((m) => m.ply === ply);
  const mark = {
    ply,
    note: null,
    keyMoment: false,
    posterior: false,
    ...existing,
    ...patch,
  };
  return {
    ...reading,
    marks: [...reading.marks.filter((m) => m.ply !== ply), mark].sort((a, b) => a.ply - b.ply),
  };
}
