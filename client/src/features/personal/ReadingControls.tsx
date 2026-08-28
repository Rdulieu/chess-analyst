import { useCallback } from "react";

import { DeclaredSeverityControl } from "./DeclaredSeverityControl";
import { KeyMomentControl } from "./KeyMomentControl";
import { NoteEditor } from "./NoteEditor";
import { SealAction } from "./SealAction";
import { SealedMarkReadout, SealedReadout } from "./SealedReadout";
import { ShortcutsNotice } from "./ShortcutsNotice";
import { ReadingTally } from "./ReadingTally";
import { WholeGameNote } from "./WholeGameNote";
import { useReadingShortcuts, type ReadingCommand } from "./shortcuts";
import type { MarkPatch } from "./PersonalReading";
import type { PersonalAnalysis, PersonalMark } from "../../types";

/**
 * The reading route's side panel, for one ply.
 *
 * A component rather than the route's inline render prop, and for a reason the
 * shortcuts made unavoidable: the ply is `Board`'s state, handed down through its
 * `controls` slot, and a slot cannot call a hook. The keyboard has to know which
 * Move it is writing on, so the panel had to become a place where a hook can
 * live.
 */
export function ReadingControls({
  ply,
  reading,
  playersOwnMove,
  sealing,
  sealRefusal,
  moves,
  onWrite,
  onSeal,
}: {
  ply: number;
  reading: PersonalAnalysis;
  playersOwnMove: boolean;
  sealing: boolean;
  sealRefusal: string | null;
  /** The Game's half-moves — the progress figure's denominator. */
  moves: number;
  onWrite: (ply: number, patch: MarkPatch) => void;
  onSeal: () => void;
}) {
  const sealedAt = reading.sealedAt;
  const posterior = sealedAt !== null;
  const mark = markAt(reading, ply, posterior);

  /*
   * The keyboard, for the two commands whose state lives here. The arrows are
   * `Board`'s, because stepping is `Board`'s — each command is handled where the
   * state it changes lives, rather than routed back up through a callback.
   *
   * The starting Position has no Move to judge, so it has no verdict and no
   * pivot: the shortcuts are simply not installed there, which is stricter than
   * ignoring them and cannot drift from what the screen renders.
   */
  const run = useCallback(
    (command: ReadingCommand) => {
      if (command.kind === "verdict") onWrite(ply, { declaredSeverity: command.severity });
      if (command.kind === "keyMoment") onWrite(ply, { keyMoment: !(mark?.keyMoment ?? false) });
    },
    [ply, mark?.keyMoment, onWrite],
  );
  useReadingShortcuts(ply === 0 ? null : run);

  return (
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
            posed={mark?.declaredSeverity ?? null}
            playersOwnMove={playersOwnMove}
            posterior={posterior}
            onPose={(severity) => onWrite(ply, { declaredSeverity: severity })}
            // `null` reaches the server as `null`: an omitted field would leave
            // the verdict exactly where it was.
            onWithdraw={() => onWrite(ply, { declaredSeverity: null })}
          />
          <KeyMomentControl
            ply={ply}
            posed={mark?.keyMoment ?? false}
            posterior={posterior}
            onToggle={(posed) => onWrite(ply, { keyMoment: posed })}
          />
          <NoteEditor
            ply={ply}
            note={mark?.note ?? null}
            posterior={posterior}
            onSave={(note) => onWrite(ply, { note })}
            // `null` is the erasure, and it has to reach the server as `null`:
            // an omitted field would leave the old text exactly where it was.
            onErase={() => onWrite(ply, { note: null })}
          />
          {sealedAt === null ? (
            <SealAction empty={reading.marks.length === 0} sealing={sealing} onSeal={onSeal} />
          ) : null}
          {sealRefusal && <p role="alert">{sealRefusal}</p>}
    {/* A shortcut discovered by accident does not exist. Said on the screen,
        below the controls (ADR-0021) and at a height that never changes — it is
        the same sentence in every state. */}
    <ShortcutsNotice />
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
