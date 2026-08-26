import { gamePositions } from "../../src/chess/positions";
import type { StoredEvaluation } from "../../src/analysis/derivation";
import type { PersonalMark, PersonalAnalysis } from "../../src/personal/repository";

/**
 * **A real Game, really analysed, really read.** One of the Player's own blitz
 * losses, put through the engine at depth 16, and read by hand **before** the
 * engine's record was ever shown — sealed as read unaided on 2026-08-25.
 *
 * It is kept because it exercises, **in one reading and on real data**, nearly
 * every rule US-16b argues for — where the synthetic fixtures each had to argue
 * one at a time, and where the Games the agentic runs could reach held almost
 * nothing at all:
 *
 * - an **agreement** on the diagonal: a `Mistake` the engine also measures a `Mistake`;
 * - a **divergence downwards** — a `Mistake` where the engine measures a `Blunder`,
 *   the Player reading the danger milder than it was;
 * - **two divergences upwards** — Moves the Player faults and the engine does not.
 *   Two up against one down is exactly three, which is the smallest sample the
 *   bias sentence consents to speak from: this fixture sits **on** that boundary;
 * - a verdict on an **opponent's** Move, kept and never scored;
 * - a verdict on a Move the analysis **excludes** as already decided, likewise
 *   shown and not scored — one of **sixteen** such Moves, the Game having been
 *   lost long before it ended. That gap between 38 Moves played and 22 counted is
 *   the very thing ADR-0017 says a page must make readable instead of leaving to
 *   look like a bug;
 * - **three `Key moment`s**, two landing on real faults and one on nothing — so
 *   the reading finds **all** of the damage while still producing a **miss** with
 *   its distance. That combination is worth more than any invented case: it shows
 *   a misplaced marker costs nothing *and* gains nothing, which is precisely what
 *   "additive, and no tolerance window" means;
 * - a **posterior** mark carrying the Player's own note, written after the reveal
 *   and part of no figure.
 *
 * Stored the way `recap.test.ts` and `confrontation.test.ts` already build their
 * fixtures — a PGN and the raw per-ply scores — so the whole engine side is
 * **re-derived by the production code** rather than frozen as an expected result.
 * Retuning a threshold retunes this fixture with it, which is the point (ADR-0009).
 */
export const REAL_READING_PGN = "[Event \"Live Chess\"]\n[Site \"Chess.com\"]\n[Date \"2026.08.13\"]\n[Round \"-\"]\n[White \"DudulSmash\"]\n[Black \"IAugureyI\"]\n[Result \"0-1\"]\n[CurrentPosition \"6k1/7p/2p1p3/pp5p/2P5/KP2b2q/P7/8 w - - 0 39\"]\n[Timezone \"UTC\"]\n[ECO \"A04\"]\n[ECOUrl \"https://www.chess.com/openings/Reti-Opening-Nimzo-Larsen-Variation...3.d4-g6-4.Bb2-Bg7-5.e3\"]\n[UTCDate \"2026.08.13\"]\n[UTCTime \"19:21:42\"]\n[WhiteElo \"1216\"]\n[BlackElo \"1280\"]\n[TimeControl \"60+1\"]\n[Termination \"IAugureyI won by resignation\"]\n[StartTime \"19:21:42\"]\n[EndDate \"2026.08.13\"]\n[EndTime \"19:24:21\"]\n[Link \"https://www.chess.com/game/live/172949667216\"]\n\n1. b3 {[%clk 0:01:00.8]} 1... Nf6 {[%clk 0:00:59.9]} 2. Bb2 {[%clk 0:01:01.7]} 2... g6 {[%clk 0:01:00.7]} 3. e3 {[%clk 0:01:01.7]} 3... Bg7 {[%clk 0:01:01]} 4. d4 {[%clk 0:01:01.2]} 4... d6 {[%clk 0:01:00.9]} 5. Nf3 {[%clk 0:01:00.6]} 5... Bg4 {[%clk 0:01:01.3]} 6. h3 {[%clk 0:00:49.1]} 6... Bxf3 {[%clk 0:01:01.2]} 7. Qxf3 {[%clk 0:00:48.9]} 7... O-O {[%clk 0:01:01.6]} 8. c4 {[%clk 0:00:45.8]} 8... c6 {[%clk 0:01:01.5]} 9. Be2 {[%clk 0:00:45.8]} 9... Re8 {[%clk 0:01:01.1]} 10. O-O {[%clk 0:00:45.9]} 10... e5 {[%clk 0:01:01]} 11. dxe5 {[%clk 0:00:43.8]} 11... dxe5 {[%clk 0:01:01.9]} 12. Bxe5 {[%clk 0:00:42.7]} 12... Rxe5 {[%clk 0:01:01.6]} 13. Nc3 {[%clk 0:00:40.7]} 13... Re8 {[%clk 0:00:56.4]} 14. Rad1 {[%clk 0:00:40.2]} 14... Qc7 {[%clk 0:00:55]} 15. Rd3 {[%clk 0:00:37.3]} 15... Nbd7 {[%clk 0:00:54.3]} 16. Rfd1 {[%clk 0:00:36.7]} 16... Ne5 {[%clk 0:00:54.5]} 17. Qf4 {[%clk 0:00:27.4]} 17... Rac8 {[%clk 0:00:48.5]} 18. Rd6 {[%clk 0:00:23.8]} 18... Re6 {[%clk 0:00:39.8]} 19. Rxe6 {[%clk 0:00:21.5]} 19... fxe6 {[%clk 0:00:40.7]} 20. Ne4 {[%clk 0:00:21.4]} 20... Nh5 {[%clk 0:00:37.9]} 21. Qxe5 {[%clk 0:00:20.2]} 21... Bxe5 {[%clk 0:00:37.9]} 22. Nf6+ {[%clk 0:00:18.7]} 22... Bxf6 {[%clk 0:00:37.3]} 23. Bxh5 {[%clk 0:00:13.6]} 23... gxh5 {[%clk 0:00:38.2]} 24. Kf1 {[%clk 0:00:14.1]} 24... Bc3 {[%clk 0:00:37.4]} 25. Ke2 {[%clk 0:00:13.9]} 25... Rd8 {[%clk 0:00:37.7]} 26. Rc1 {[%clk 0:00:13.9]} 26... Rd2+ {[%clk 0:00:35.1]} 27. Ke1 {[%clk 0:00:12.8]} 27... Rc2+ {[%clk 0:00:31.6]} 28. Kd1 {[%clk 0:00:11]} 28... Rxc1+ {[%clk 0:00:32.1]} 29. Kxc1 {[%clk 0:00:11.8]} 29... Be1 {[%clk 0:00:32.1]} 30. Kc2 {[%clk 0:00:12.7]} 30... Bxf2 {[%clk 0:00:32.3]} 31. Kb2 {[%clk 0:00:13.2]} 31... Qd7 {[%clk 0:00:32.7]} 32. Ka3 {[%clk 0:00:14.1]} 32... Bxe3 {[%clk 0:00:32.6]} 33. Kb4 {[%clk 0:00:14.9]} 33... Qd2+ {[%clk 0:00:32.6]} 34. Ka3 {[%clk 0:00:14.8]} 34... Qxg2 {[%clk 0:00:33.1]} 35. Kb4 {[%clk 0:00:13.8]} 35... Qxh3 {[%clk 0:00:34]} 36. Ka3 {[%clk 0:00:13.6]} 36... b6 {[%clk 0:00:34]} 37. Kb4 {[%clk 0:00:14.5]} 37... a5+ {[%clk 0:00:34]} 38. Ka3 {[%clk 0:00:15.3]} 38... b5 {[%clk 0:00:33.9]} 0-1";

/**
 * The raw stored `Evaluation` of every ply, side-to-move relative, exactly as the
 * pass wrote them: centipawns or a mate distance, one of the two always absent.
 * The mates are real — the Game ends in a forced sequence — and they are kept
 * because a fixture that quietly dropped them would stop exercising that path.
 */
const REAL_READING_SCORES: [number | null, number | null][] = [
  [41, null], [21, null], [0, null], [4, null], [8, null], [-6, null],
  [15, null], [-7, null], [19, null], [-19, null], [52, null], [-47, null],
  [43, null], [-41, null], [127, null], [-30, null], [33, null], [-29, null],
  [26, null], [-19, null], [21, null], [-24, null], [24, null], [422, null],
  [-423, null], [424, null], [-398, null], [400, null], [-380, null], [391, null],
  [-391, null], [426, null], [-453, null], [455, null], [-320, null], [326, null],
  [-286, null], [284, null], [-272, null], [287, null], [-98, null], [476, null],
  [-434, null], [666, null], [-651, null], [662, null], [-670, null], [726, null],
  [-704, null], [761, null], [-767, null], [1299, null], [null, -16], [null, 6],
  [null, -15], [null, 3], [null, -14], [null, 3], [-926, null], [977, null],
  [-1008, null], [null, 10], [null, -9], [null, 5], [null, -4], [null, 3],
  [null, -3], [null, 2], [null, -5], [null, 4], [null, -7], [null, 4],
  [null, -5], [null, 4], [null, -6], [null, 4], [null, -6]
];

/** The Player's colour in that Game. */
export const REAL_READING_COLOR = "white" as const;

/** The stored rows, each ply's Position replayed from the Game's own PGN (ADR-0012). */
export function realReadingEvaluations(): StoredEvaluation[] {
  const fens = gamePositions(REAL_READING_PGN);
  return REAL_READING_SCORES.map(([cp, mate], ply) => ({ ply, fen: fens[ply], cp, mate, pv: "" }));
}

/**
 * The marks as the Player wrote them, sealed layer first. The note is theirs,
 * **verbatim** — typo and all: it is data, not prose to improve.
 */
export const REAL_READING_MARKS: PersonalMark[] = [
  { ply: 23, declaredSeverity: "mistake", note: null, keyMoment: true, posterior: false },
  { ply: 31, declaredSeverity: "mistake", note: null, keyMoment: true, posterior: false },
  { ply: 34, declaredSeverity: "inaccuracy", note: null, keyMoment: false, posterior: false },
  { ply: 41, declaredSeverity: "mistake", note: null, keyMoment: true, posterior: false },
  { ply: 41, declaredSeverity: "mistake", note: "La partie est perdu apres ce coup. Ensuite je fais n'importe quoi mais ça ne change rien", keyMoment: true, posterior: true },
  { ply: 43, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false },
  { ply: 45, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false },
];

/** The sealed reading — read unaided, which is what makes it worth confronting. */
export function realReading(gameId = 1): PersonalAnalysis {
  return {
    gameId,
    sealedAt: "2026-08-25T14:43:45.735Z",
    engineSeenBeforeSeal: false,
    marks: REAL_READING_MARKS,
  };
}
