import type { Game } from "../db/schema";
import { gameNotations } from "../chess/positions";
import { gameRecap, type GameRecap } from "../analysis/recap";
import { phases, type Phase } from "../analysis/phase";
import type { SearchRegime } from "../engine/types";
import { gameAnnotations, gamePlies, moveSeverities } from "../analysis/derivation";
import type { MoveSeverity } from "../danger/move-quality";
import { countedMoves, type MoveCount, type UncountedReason } from "../analysis/counted";
import {
  designates,
  moveSignals,
  DEFAULT_THRESHOLDS,
  type MoveSignals,
  type SignalThresholds,
  type SignalVerdict,
  type StoredLine,
} from "./signals";

export type { StoredLine } from "./signals";

/** One line of the report: one of the Player's Moves, as the review reads it. */
export interface MoveReportRow {
  /** The ply this Move led to — the index every other read path uses. */
  ply: number;
  /** The Move in standard notation, so a human can go and look at it. */
  san: string;
  /** The severity the app shows for this Move, `null` when it shows none. */
  severity: MoveSeverity | null;
  /** Whether the analysis counts it and, when it does not, why. */
  counted: MoveCount;
  /** What it cost the Player, in winning-chances points — `0` when excluded. */
  chancesLost: number;
  /** The mechanical facts about the Move, on every Move and not only the flagged. */
  signals: MoveSignals;
  /** Which of them fire at the setting this run was given. */
  designated: SignalVerdict;
  /**
   * The `Phase` this Move was played in, under **both** readings of the move cap
   * — `kept` being the app's own. The two are carried side by side rather than
   * counted here: what the requester is owed is how many Moves move, and that is
   * a fold over these lines (D14).
   */
  phase: { kept: Phase; onNumber: Phase };
  /**
   * How the **opponent** answered this Move — `null` when the Game ended on it.
   *
   * Measured (D12) and **never shown in the app**: the Player cannot today tell
   * *I collapsed* from *he was too strong*, which are opposite conclusions about
   * what to work on, and US-15d should inherit a figure rather than a worry.
   *
   * Its `severity` is stated **only where the analysis would count the Move for
   * them** — the same denominator rule, applied to the other colour. That is the
   * requester's own reserve: no mistake in a Position won since Move 12 proves
   * nothing, and a measure that ignored it would say mechanically that every
   * opponent plays well — the exact mirror of our own blind spot. So a `null`
   * severity beside `counted: true` means "no fault"; beside `counted: false` it
   * means "not measured", and the reason says which.
   */
  opponentReply: { severity: MoveSeverity | null; counted: MoveCount } | null;
}

/**
 * What the lines add up to — the recap's own terms, obtained by **folding the
 * lines** rather than by asking a second time. Compared to `recap` in the report's
 * own tests, which is the reconciliation ADR-0017 asks for: US-15c's aggregate is
 * this same fold, one Game further out.
 */
export interface ReportTotals {
  playerMoves: number;
  countedMoves: number;
  excluded: Record<UncountedReason, number>;
  flaggedMoves: number;
  countedErrors: number;
  chancesLost: number;
  flaggedLoss: number;
  drift: number;
}

/**
 * The Moves where the mechanic gets it wrong, **produced by the report itself**
 * (D6): the human control is worth its price on these and not on the eighty
 * obvious Moves of a corpus, and a list that has to be hunted for is a list
 * nobody reads.
 */
export interface Attention {
  /** Designated by a signal and flagged by nobody — what the app would miss. */
  shownByNoOne: MoveReportRow[];
  /**
   * Flagged by an outside reference and designated by no signal — what no
   * predicate would rescue. `null` when no reference was given: with nothing to
   * disagree with, an empty list would read as "the signals caught everything".
   */
  missedBySignals: MoveReportRow[] | null;
  /**
   * How much of the outside reference could be **placed** on a Player Move.
   * `null` when none was given.
   *
   * It is stated because that reference is the one datum nothing here derives —
   * it is transcribed by hand — so an off-by-one in a ply, or a colour
   * confusion, otherwise reads as "the signals caught it" (found by this slice's
   * Feature Path, which passed an opponent half-move and a ply that does not
   * exist and saw both vanish).
   */
  reference: { given: number; placed: number } | null;
}

/** The report of one Game: its lines, and what they add up to. */
export interface GameReport {
  rows: MoveReportRow[];
  /** The Moves worth a human's attention, in both directions. */
  attention: Attention;
  /** The recap the app shows for this Game — **called**, never recomputed. */
  recap: GameRecap;
  /** The same figures, folded from the lines above. */
  totals: ReportTotals;
  /**
   * Whether the fold and the recap agree — the promise of ADR-0017, stated by
   * the report itself rather than by whatever prints it. The comparison is on
   * the figures a reader checks, to the precision a reader checks them at.
   */
  reconciles: boolean;
}

/**
 * The measuring instrument of US-15a-bis: **one line per Player Move**, of which
 * the Game's recap is the aggregate — already the shape of the fold US-15c will
 * have to perform.
 *
 * It **calls** the app's own derivation and never re-implements a rule of it: a
 * second implementation of the method would agree only by luck and diverge in
 * silence, which is what ADR-0017 refuses. What this module adds is the
 * **signals** — read off columns already stored, so retuning one costs no engine
 * time (ADR-0024).
 */
export function gameReport(
  game: Pick<Game, "playerColor" | "pgn">,
  evals: StoredLine[],
  options: {
    regime?: SearchRegime | null;
    /** Where the signals are set to fire — partial, over the defaults. */
    thresholds?: Partial<SignalThresholds>;
    /**
     * The plies an outside reference flags on this Game — lichess's own report,
     * entered by hand. It is the one datum nothing here derives, which is why it
     * arrives as an argument and is never asserted (SEAMS).
     */
    flaggedElsewhere?: number[];
  } = {},
): GameReport {
  // The very array the Analyse page reads (`/api/games/:id/annotations`), so a
  // line of this report and the screen cannot say two different things.
  const annotations = gameAnnotations(game, evals);
  const plies = gamePlies(evals);
  const thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds };
  const san = gameNotations(game.pgn);
  // The other reading of the cap, over the same FENs and through the same
  // function: a second implementation of the Phase walk would agree by luck.
  // The opponent's own severities and denominator: the SAME two functions, the
  // other colour. Deriving them costs no engine time — `evaluations` carries one
  // row per half-move, both colours confounded.
  const opponentColor = game.playerColor === "white" ? "black" : "white";
  const opponentSeverities = moveSeverities(plies, opponentColor);
  const opponentCounted = countedMoves(plies, opponentColor);

  const onNumber = phases(
    plies.map((ply) => ply.fen),
    "on-number",
  );

  const rows: MoveReportRow[] = [];
  annotations.forEach((annotation, i) => {
    // `counted` is `null` for ply 0 and for the opponent's Moves — nothing is
    // derived for those, which is exactly the test for "is this a Player Move".
    if (annotation.counted === null) return;
    const signals = moveSignals(plies, i, game.playerColor, from(evals, i - 1));
    rows.push({
      ply: i,
      san: san[i],
      severity: annotation.severity,
      counted: annotation.counted,
      chancesLost: annotation.chancesLost ?? 0,
      signals,
      designated: designates(signals, thresholds),
      phase: { kept: annotation.phase, onNumber: onNumber[i] },
      opponentReply: reply(opponentSeverities, opponentCounted, i),
    });
  });
  const recap = gameRecap(game, evals, options.regime ?? null);
  const totals = fold(rows);
  return {
    rows,
    attention: attention(rows, options.flaggedElsewhere),
    recap,
    totals,
    reconciles: reconciles(totals, recap),
  };
}

/** Whether any of the five signals designates this Move at this setting. */
function designatedAtAll(row: MoveReportRow): boolean {
  return Object.values(row.designated).some(Boolean);
}

/** The two lists, both folded from the lines — nothing new is derived here. */
function attention(rows: MoveReportRow[], flaggedElsewhere?: number[]): Attention {
  const plies = new Set(rows.map((row) => row.ply));
  return {
    shownByNoOne: rows.filter((row) => designatedAtAll(row) && row.severity === null),
    missedBySignals:
      flaggedElsewhere === undefined
        ? null
        : rows.filter((row) => flaggedElsewhere.includes(row.ply) && !designatedAtAll(row)),
    reference:
      flaggedElsewhere === undefined
        ? null
        : {
            given: flaggedElsewhere.length,
            placed: flaggedElsewhere.filter((ply) => plies.has(ply)).length,
          },
  };
}

/**
 * Whether the lines add up to the recap, on the figures a reader checks and at
 * the precision they check them at: six decimals is far past what any screen
 * shows and far short of the last bit of a float, which two orders of summation
 * can legitimately differ on.
 */
function reconciles(totals: ReportTotals, recap: GameRecap): boolean {
  const close = (a: number, b: number) => a.toFixed(6) === b.toFixed(6);
  return (
    totals.playerMoves === recap.playerMoves &&
    totals.countedMoves === recap.countedMoves &&
    totals.excluded.forced === recap.excluded.forced &&
    totals.excluded.decided === recap.excluded.decided &&
    totals.flaggedMoves === recap.flaggedMoves &&
    totals.countedErrors === recap.countedErrors &&
    close(totals.chancesLost, recap.chancesLost) &&
    close(totals.flaggedLoss, recap.flaggedLoss) &&
    close(totals.drift, recap.drift)
  );
}

/**
 * The opponent's answer to the Move that led to ply `i`: the half-move from `i`
 * to `i + 1`, hence their severity at index `i` and their own `MoveCount` at
 * `i + 1`. `null` when there is no such half-move — the Game ended here.
 */
function reply(
  severities: (MoveSeverity | null)[],
  counted: (MoveCount | null)[],
  i: number,
): MoveReportRow["opponentReply"] {
  const count = counted[i + 1];
  if (count === undefined || count === null) return null;
  return { severity: count.counted ? severities[i] : null, counted: count };
}

/** The stored row of a given ply — the second line's score lives only there. */
function from(evals: StoredLine[], ply: number): StoredLine {
  return evals.find((row) => row.ply === ply)!;
}

/**
 * The lines added up. It sums what the lines carry and decides nothing: every
 * figure here was derived once, by the app's own functions, and is only being
 * folded — which is what makes the comparison with `gameRecap` a check and not a
 * coincidence.
 */
function fold(rows: MoveReportRow[]): ReportTotals {
  const totals: ReportTotals = {
    playerMoves: 0,
    countedMoves: 0,
    excluded: { forced: 0, decided: 0 },
    flaggedMoves: 0,
    countedErrors: 0,
    chancesLost: 0,
    flaggedLoss: 0,
    drift: 0,
  };

  for (const row of rows) {
    totals.playerMoves += 1;
    if (row.severity) totals.flaggedMoves += 1;
    if (!row.counted.counted) {
      if (row.counted.reason) totals.excluded[row.counted.reason] += 1;
      continue;
    }
    totals.countedMoves += 1;
    if (row.severity) totals.countedErrors += 1;
    if (row.chancesLost <= 0) continue;
    totals.chancesLost += row.chancesLost;
    if (row.severity) totals.flaggedLoss += row.chancesLost;
  }

  totals.drift = totals.chancesLost - totals.flaggedLoss;
  return totals;
}
