import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Board } from "../../components/Board";
import { GameHeader } from "../games/GameHeader";
import {
  fetchPersonalAnalysis,
  savePersonalMark,
  sealPersonalAnalysis,
  GameNotThisProfiles,
  SealRefused,
} from "../../api";
import { DeclaredSeverityControl } from "./DeclaredSeverityControl";
import { NoteEditor } from "./NoteEditor";
import { KeyMomentControl } from "./KeyMomentControl";
import { SealAction } from "./SealAction";
import { SealedMarkReadout, SealedReadout } from "./SealedReadout";
import { engineWasSeen } from "./engineSeen";
import { MoveMarks } from "./MoveMarks";
import { ReadingTally } from "./ReadingTally";
import { WholeGameNote } from "./WholeGameNote";
import { parseGame } from "../../chess/history";
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
  /** What the server said when it would not seal — shown as it came. */
  const [sealRefusal, setSealRefusal] = useState<string | null>(null);
  const [sealing, setSealing] = useState(false);
  /** The Game's half-moves — the progress figure's denominator, read from the PGN. */
  const moves = useMemo(() => parseGame(game.pgn).plies.length, [game.pgn]);

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
  /**
   * Seals the reading, handing the server the **provenance** — had the engine
   * been shown for **this** Game? Read at the moment of sealing and nowhere else:
   * it is a statement about the past, and reading it earlier would freeze an
   * answer that was still changing.
   */
  const seal = useCallback(async () => {
    setSealing(true);
    setSealRefusal(null);
    await sealPersonalAnalysis(game.id, profileId, engineWasSeen(game.id))
      .then(setReading)
      .catch((cause: Error) => {
        // A refusal is a fact about the reading and is said in the server's own
        // words; anything else is a malfunction and is said as one.
        if (cause instanceof SealRefused) setSealRefusal(cause.message);
        else setRefused("failed");
      })
      .finally(() => setSealing(false));
  }, [game.id, profileId]);

  if (refused === "foreign")
    return (
      <p role="status">
        Cette partie n'appartient pas au profil courant : elle n'a pas de lecture ici.
      </p>
    );
  if (refused === "failed")
    return <p role="alert">La lecture de cette partie n'a pas pu être chargée.</p>;
  if (!reading) return <p>Chargement de ma lecture…</p>;

  const { sealedAt } = reading;

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
        //
        // What IS shown in the list is the Player's own marks: a reading has to be
        // locatable without stepping through every Move to find where one wrote.
        moveMarks={(ply) => <MoveMarks marks={reading.marks} ply={ply} />}
        controls={(ply) => (
          /*
            ADR-0021 — what the Player acts on comes first and never moves; what
            explains it, and what varies with the ply, lives below.

            The three controls the Player uses Move after Move lead: the verdict,
            the pivot, the Note. Then the once-per-reading action. Then, and only
            then, everything whose presence or height follows the ply — the sealed
            readout (whose height depends on what was written that day and has no
            knowable maximum), the whole-Game Note, and the tally.

            The rule is about ORDER, not about reserved height: a fixed height
            would have cost 194 to 312 px of empty column exactly where the column
            is scarcest. And it is about order for a second reason — an order is
            checked in a component test at every commit, where a pixel is only
            measurable at the portal.
          */
          <div data-part="reading-controls">
            <DeclaredSeverityControl
              ply={ply}
              posed={markAt(reading, ply, sealedAt !== null)?.declaredSeverity ?? null}
              playersOwnMove={playersOwnPly(ply, game.playerColor)}
              posterior={sealedAt !== null}
              onPose={(severity) => void write(ply, { declaredSeverity: severity })}
              // `null` reaches the server as `null`: an omitted field would leave
              // the verdict exactly where it was.
              onWithdraw={() => void write(ply, { declaredSeverity: null })}
            />
            <KeyMomentControl
              ply={ply}
              posed={markAt(reading, ply, sealedAt !== null)?.keyMoment ?? false}
              posterior={sealedAt !== null}
              onToggle={(posed) => void write(ply, { keyMoment: posed })}
            />
            <NoteEditor
              ply={ply}
              note={markAt(reading, ply, sealedAt !== null)?.note ?? null}
              posterior={sealedAt !== null}
              onSave={(note) => void write(ply, { note })}
              // `null` is the erasure, and it has to reach the server as `null`:
              // an omitted field would leave the old text exactly where it was.
              onErase={() => void write(ply, { note: null })}
            />
            {sealedAt === null ? (
              <SealAction empty={reading.marks.length === 0} sealing={sealing} onSeal={seal} />
            ) : null}
            {sealRefusal && <p role="alert">{sealRefusal}</p>}
            {sealedAt !== null && (
              <>
                <SealedReadout
                  sealedAt={sealedAt}
                  engineSeenBeforeSeal={reading.engineSeenBeforeSeal}
                />
                {/* What was written on THIS Move when the reading was sealed,
                    beside — never replaced by — what has been written since.
                    Below the controls now, and unabridged: it is the block whose
                    height genuinely varies, and no saving of height is allowed to
                    fold it away. */}
                <SealedMarkReadout mark={markAt(reading, ply, false)} ply={ply} />
                {/* Writing stays open after the seal: seeing the engine and
                    understanding why is the most fertile moment of the exercise,
                    so forbidding it would be absurd — and counting it would be
                    dishonest. Hence the words — and the legend of the verdict
                    control above says it too, for a Player who scrolled past. */}
                <p data-part="posterior-notice">
                  Ce que vous écrivez maintenant est conservé comme une couche
                  <strong> postérieure</strong> au scellement, et reste hors de la confrontation.
                </p>
              </>
            )}
            {/* The Note about the whole Game, legible from inside the Game — it
                was written at the starting Position, but it is not about it. */}
            <WholeGameNote marks={reading.marks} ply={ply} />
            <ReadingTally marks={reading.marks} moves={moves} />
          </div>
        )}
      />
    </div>
  );
}

/**
 * What the Player has said about one ply **in one layer**. The layer is explicit
 * at every call: before the seal there is only the initial one, after it the
 * controls act on the posterior one while the initial stays readable beside them.
 * A `markAt` that guessed would be the bug that quietly overwrites a sealed
 * reading.
 */
function markAt(
  reading: PersonalAnalysis,
  ply: number,
  posterior: boolean,
): PersonalMark | undefined {
  return reading.marks.find((m) => m.ply === ply && m.posterior === posterior);
}

/**
 * The reading with one ply's mark replaced — the optimistic echo of a write.
 * Mirrors the server's own rules, so the screen shown before the answer is the
 * one the answer will confirm: a blank `Note` is no Note, and a ply with nothing
 * left said about it keeps no mark (**silence is not a value**).
 */
function withMark(reading: PersonalAnalysis, ply: number, patch: MarkPatch): PersonalAnalysis {
  // The layer follows the seal, exactly as it does on the server: after sealing,
  // every write is posterior, and an amendment starts from the sealed mark rather
  // than from nothing — the Player is amending a reading, not writing a fresh one.
  const posterior = reading.sealedAt !== null;
  const base = markAt(reading, ply, posterior) ?? (posterior ? markAt(reading, ply, false) : undefined);
  const merged = {
    ply,
    declaredSeverity: null,
    note: null,
    keyMoment: false,
    ...base,
    ...patch,
    posterior,
  };
  const mark = { ...merged, note: merged.note === null ? null : merged.note.trim() || null };
  const others = reading.marks.filter((m) => !(m.ply === ply && m.posterior === posterior));
  const silent = mark.declaredSeverity === null && mark.note === null && !mark.keyMoment;
  return {
    ...reading,
    marks: (silent ? others : [...others, mark]).sort(
      (a, b) => a.ply - b.ply || Number(a.posterior) - Number(b.posterior),
    ),
  };
}
