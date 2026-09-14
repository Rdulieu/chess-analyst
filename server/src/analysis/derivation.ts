import type { Game } from "../db/schema";
import { winningChances, type CpOrMate } from "../danger/winning-chances";
import { classifyMove, type MoveSeverity } from "../danger/move-quality";
import { phases, type Phase } from "./phase";
import { chancesLostByMove, countedMoves, type MoveCount } from "./counted";

/** One half-move's annotation (US-7): the `Evaluation` and win% converted to
 *  White-relative (CONTEXT.md — stored values are side-to-move relative), and
 *  the Move's severity that led to this Position (`null` for ply 0 and for
 *  the opponent's Moves — CONTEXT.md: severities are Player-only). */
export interface MoveAnnotation {
  ply: number;
  whiteEval: CpOrMate;
  whiteWinChances: number;
  severity: MoveSeverity | null;
  /**
   * The `Best line` from **this** Position, in UCI (CONTEXT.md). One field
   * answers both readings the Player needs: the line at ply `n` is what should
   * have been played there, and the line at ply `n + 1` — starting with the
   * opponent's best reply — is how the Move actually played is punished.
   */
  bestLine: string[];
  /**
   * The `Phase` this Move was played in (CONTEXT.md) — derived from the FEN
   * stored with the `Evaluation`, in the Game's own sequence, so it latches.
   * No column, no engine call: retunable without re-analysing anything.
   */
  phase: Phase;
  /**
   * Whether this Move counts in the analysis and, when it does not, why
   * (CONTEXT.md `Counted Move`). `null` for ply 0 and for the **opponent's**
   * Moves: nothing is derived for them, which is not the same claim as "not
   * counted".
   */
  counted: MoveCount | null;
  /**
   * What this Move cost the Player, in winning-chances points (ADR-0017 — a Game
   * carries the per-Move delta the aggregate consumes). `null` where nothing is
   * contributed, `0` for a Move that does not count. The Game's own recap is the
   * sum of these, so a trace drawn from them cannot disagree with the total
   * stated beside it.
   */
  chancesLost: number | null;
  /**
   * What the **opponent's** Move offered, when it offered anything (CONTEXT.md
   * `Opportunity`, ADR-0034). `null` for ply 0, for the Player's own Moves, and
   * for an opponent Move that offered nothing.
   *
   * **Beside `severity`, never inside it.** The measurement is the same band;
   * the subject is not. Filling `severity` here would be three lines cheaper and
   * would silently change what `Danger position`, "vos erreurs" and the weak
   * openings are about — which is the entire reason this field exists.
   */
  opportunity: Opportunity | null;
}

/**
 * What one of the opponent's Moves left on the table (CONTEXT.md `Opportunity`).
 * Its severity is a **property** of it — *an `Opportunity` the size of a
 * `Blunder`* — read off the Player's own band, not a competing vocabulary.
 */
export interface Opportunity {
  severity: MoveSeverity;
}

/** One analyzed Game's per-Position FEN, raw `Evaluation` and win% (ply 0 = initial Position). */
export interface Ply {
  fen: string;
  /** The raw stored `Evaluation`, side-to-move relative. */
  evaluation: CpOrMate;
  /** Winning chances (0–100) for whoever is to move at this Position. */
  winChances: number;
  /** The `Best line` from this Position, in UCI. */
  bestLine: string[];
}

/** One stored `Evaluation` row, as every read path sees it: the Position it is
 *  of, and the engine's verdict on it. */
export interface StoredEvaluation {
  ply: number;
  fen: string;
  cp: number | null;
  mate: number | null;
  /** The `Best line`, whole, in UCI, space-separated as stored (ADR-0016). */
  pv: string;
}

/** A Game's per-Position FENs, raw `Evaluation`s and win% (ply 0 = initial Position), shared by
 *  every feature deriving from US-4's stored `evaluations` (`Danger position`, US-7's per-Move
 *  annotations) — ADR-0009: no engine call, no stored aggregate, everything read at request time.
 *
 *  The FEN comes from the row itself (ADR-0012): replaying the Game's PGN here cost 2.4 s per
 *  `/danger` request at 50 analyzed Games, for Positions the `Analysis pass` already held. */
export function gamePlies(evals: StoredEvaluation[]): Ply[] {
  return [...evals]
    .sort((a, b) => a.ply - b.ply)
    .map((evaluation) => ({
      fen: evaluation.fen,
      evaluation,
      winChances: winningChances(evaluation),
      // Split once, here, where the stored column becomes something to read: no
      // caller should have to know that the line is one space-separated column.
      bestLine: evaluation.pv === "" ? [] : evaluation.pv.split(" "),
    }));
}

/**
 * The severity of each half-move of the Game, Player-relative — `null` when
 * the half-move is not the Player's own (CONTEXT.md: severities are only ever
 * computed for the Player). `severities[i]` is the Move from `plies[i]` to
 * `plies[i + 1]`. The Position's `winChances` is already relative to whoever
 * is about to move there; the resulting Position's is relative to the
 * *opponent* (their turn next), so it is flipped (`100 -`) to stay
 * Player-relative for the drop.
 */
export function moveSeverities(plies: Ply[], playerColor: Game["playerColor"]): (MoveSeverity | null)[] {
  const severities: (MoveSeverity | null)[] = [];
  for (let i = 0; i < plies.length - 1; i++) {
    const mover = i % 2 === 0 ? "white" : "black";
    if (mover !== playerColor) {
      severities.push(null);
      continue;
    }
    severities.push(classifyMove(plies[i].winChances, 100 - plies[i + 1].winChances));
  }
  return severities;
}

/** The other side. */
function opponentOf(playerColor: Game["playerColor"]): Game["playerColor"] {
  return playerColor === "white" ? "black" : "white";
}

/**
 * What each of the opponent's Moves **offered** the Player (CONTEXT.md
 * `Opportunity`). Index-aligned with `plies` like `countedMoves`: entry `i` is
 * about the Move that led to ply `i`. `null` for ply 0, for the Player's own
 * Moves, and wherever nothing was offered.
 *
 * **The band is the Player's own**, read off the very same `classifyMove` with
 * the very same perspective flip (`100 -`), applied to the opponent's colour.
 * No second threshold exists, and none may be introduced: one threshold, always.
 *
 * **The `Counted Move` exclusions are mirrored only halfway, and that asymmetry
 * is deliberate — do not "fix" it.** They are reused verbatim by asking
 * `countedMoves` about the opponent's colour, and then only one of the two
 * answers is honoured:
 *
 * - **already decided** discards the `Opportunity`: with the opponent's chances
 *   under `DECIDED_FLOOR` the Position had nothing left to give, so there was
 *   nothing there to take;
 * - **forced** does **not**. `forced` exists so that nobody is *blamed* for a
 *   Move they had no choice in, and here nobody is being blamed — the subject is
 *   what the Player was handed. The opponent's lack of choice does not make the
 *   piece they had to give any less takeable, and mirroring this exclusion would
 *   throw away the clearest opportunities there are.
 */
export function moveOpportunities(
  plies: Ply[],
  playerColor: Game["playerColor"],
): (Opportunity | null)[] {
  const opponent = opponentOf(playerColor);
  // `severities[i]` is the Move from `plies[i]` to `plies[i + 1]`; `counted[i]`
  // is the Move that led to `plies[i]`. Both are `null` off the opponent's plies.
  const severities = moveSeverities(plies, opponent);
  const counted = countedMoves(plies, opponent);

  return plies.map((_, i) => {
    if (i === 0) return null;
    const severity = severities[i - 1];
    if (severity === null) return null;
    const move = counted[i];
    if (move === null) return null;
    if (move.reason === "decided") return null;
    return { severity };
  });
}

/** Who is to move at the given ply index (ply 0 = start, White to move). */
function moverAt(ply: number): Game["playerColor"] {
  return ply % 2 === 0 ? "white" : "black";
}

/** Converts a side-to-move-relative `Evaluation` to White-relative (CONTEXT.md),
 *  always as a clean `{cp, mate}` pair — never the stored row as-is (which may
 *  carry other columns, e.g. `gameId`). */
function toWhiteRelative(evaluation: CpOrMate, mover: Game["playerColor"]): CpOrMate {
  const flip = mover === "black";
  return {
    cp: evaluation.cp === null ? null : flip ? -evaluation.cp : evaluation.cp,
    mate: evaluation.mate === null ? null : flip ? -evaluation.mate : evaluation.mate,
  };
}

/**
 * Every half-move of a Game annotated for display (US-7): the White-relative
 * `Evaluation`/win% for its resulting Position, and — for the Player's own
 * Moves only — the severity that led to it. Index-aligned with `gamePlies`
 * (ply 0 = starting Position), so a client's own navigation index maps
 * directly onto this array with no off-by-one.
 */
export function gameAnnotations(
  game: Pick<Game, "playerColor">,
  evals: StoredEvaluation[],
): MoveAnnotation[] {
  const plies = gamePlies(evals);
  const severities = moveSeverities(plies, game.playerColor);
  // Over the whole Game at once, and not Position by Position: the Phase latches,
  // so it can only be read as a sequence.
  const phaseOf = phases(plies.map((ply) => ply.fen));
  const counted = countedMoves(plies, game.playerColor);
  const lost = chancesLostByMove(plies, game.playerColor);
  const opportunities = moveOpportunities(plies, game.playerColor);

  return plies.map((ply, i) => {
    const mover = moverAt(i);
    return {
      ply: i,
      whiteEval: toWhiteRelative(ply.evaluation, mover),
      whiteWinChances: mover === "white" ? ply.winChances : 100 - ply.winChances,
      severity: i === 0 ? null : severities[i - 1],
      bestLine: ply.bestLine,
      phase: phaseOf[i],
      counted: counted[i],
      chancesLost: lost[i],
      opportunity: opportunities[i],
    };
  });
}
