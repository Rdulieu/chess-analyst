import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Board } from "../../components/Board";
import { GameHeader } from "../games/GameHeader";
import { fetchPersonalAnalysis, savePersonalMark, GameNotThisProfiles } from "../../api";
import { DeclaredSeverityControl } from "./DeclaredSeverityControl";
import { NoteEditor } from "./NoteEditor";
import { playersOwnPly } from "./plies";
import type { DeclaredSeverity, Game, PersonalAnalysis, PersonalMark } from "../../types";

/**
 * What one write says about a ply. Only the fields the caller **names** travel,
 * so `{ note: null }` is an erasure and an omitted field is left alone — the
 * distinction the server relies on to make erasing possible at all.
 */
export type MarkPatch = {
  declaredSeverity?: DeclaredSeverity | null;
  note?: string | null;
  keyMoment?: boolean;
};

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
export function PersonalReading({
  game,
  profileId,
  onwards,
}: {
  game: Game;
  profileId: number;
  /**
   * Where the Player goes from here, shown **only when there is a reading to
   * leave**. A screen that has just told the Player this Game is not theirs must
   * not, in the same breath, offer them a way into it.
   */
  onwards?: ReactNode;
}) {
  const [reading, setReading] = useState<PersonalAnalysis | null>(null);
  /**
   * Why there is nothing to read, when there is nothing to read. `foreign` is
   * kept apart from `failed` because it is not a malfunction: the Game is simply
   * not this `Profile`'s, and saying "an error occurred" about a correct refusal
   * would send the Player looking for a bug.
   */
  const [refused, setRefused] = useState<"foreign" | "failed" | null>(null);

  useEffect(() => {
    let live = true;
    setReading(null);
    setRefused(null);
    fetchPersonalAnalysis(game.id, profileId)
      .then((result) => live && setReading(result))
      .catch((cause: Error) => {
        if (!live) return;
        setRefused(cause instanceof GameNotThisProfiles ? "foreign" : "failed");
      });
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
  const write = useCallback(
    async (ply: number, patch: MarkPatch) => {
      // Shown at once, so posing thirty verdicts never waits on the network; the
      // answer replaces it, and a failure is said rather than swallowed.
      setReading((current) => current && withMark(current, ply, patch));
      await savePersonalMark(game.id, profileId, ply, patch)
        .then(setReading)
        .catch(() => setRefused("failed"));
    },
    [game.id, profileId],
  );

  // A reading is filed where the Game it reads is filed (ADR-0014), so a Game
  // belonging to another `Profile` has no reading to show HERE — and none of its
  // marks are rendered either. The board itself is not drawn: there is nothing
  // on this screen for the Player to do with a Game that is not theirs.
  if (refused === "foreign")
    return (
      <p role="status">
        Cette partie n'appartient pas au profil courant : elle n'a pas de lecture ici.
      </p>
    );
  if (refused === "failed")
    return <p role="alert">La lecture de cette partie n'a pas pu être chargée.</p>;
  if (!reading) return <p>Chargement de ma lecture…</p>;

  return (
    <div>
      {onwards}
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
              posed={markAt(reading, ply)?.declaredSeverity ?? null}
              playersOwnMove={playersOwnPly(ply, game.playerColor)}
              onPose={(severity) => void write(ply, { declaredSeverity: severity })}
            />
            <NoteEditor
              ply={ply}
              note={markAt(reading, ply)?.note ?? null}
              onSave={(note) => void write(ply, { note })}
              // `null` is the erasure, and it has to reach the server as `null`:
              // an omitted field would leave the old text exactly where it was.
              onErase={() => void write(ply, { note: null })}
            />
          </div>
        )}
      />
    </div>
  );
}

/** What the Player has said about one ply, if anything. */
function markAt(reading: PersonalAnalysis, ply: number): PersonalMark | undefined {
  return reading.marks.find((m) => m.ply === ply);
}

/**
 * The reading with one ply's mark replaced — the optimistic echo of a write.
 * Mirrors the server's own rules, so the screen shown before the answer is the
 * one the answer will confirm: a blank `Note` is no Note, and a ply with nothing
 * left said about it keeps no mark (**silence is not a value**).
 */
function withMark(reading: PersonalAnalysis, ply: number, patch: MarkPatch): PersonalAnalysis {
  const existing = markAt(reading, ply);
  const merged = {
    ply,
    declaredSeverity: null,
    note: null,
    keyMoment: false,
    posterior: false,
    ...existing,
    ...patch,
  };
  const mark = { ...merged, note: merged.note === null ? null : merged.note.trim() || null };
  const others = reading.marks.filter((m) => m.ply !== ply);
  const silent = mark.declaredSeverity === null && mark.note === null && !mark.keyMoment;
  return { ...reading, marks: (silent ? others : [...others, mark]).sort((a, b) => a.ply - b.ply) };
}
