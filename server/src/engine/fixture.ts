import { Chess } from "cm-chess";
import type { Engine } from "./types";

/**
 * A deterministic fake `Engine` for the lower test tiers and the agentic Feature
 * Path (ADR-0008 test backend, mirroring the injected chess.com client of
 * ADR-0002). It **never invokes the real Stockfish** — an external dependency
 * that stays out of every tier below the Happy Path.
 *
 * The centipawn score is a stable function of the Position's placement, so a
 * given Position always evaluates the same way (reproducible runs) while
 * different Positions generally differ — enough substance for the analysis pass
 * to store, without pretending to be a real evaluation.
 *
 * Its `Best line` is **legal from the Position** and its second line exists only
 * when there is a second legal move. Both are contracts and not garnish: the line
 * is drawn on the board and replayed ply by ply, and a Position with one legal
 * move is what tells "no alternative" apart from "not read".
 */
export function createFixtureEngine(): Engine {
  return {
    async evaluate(fen) {
      const legal = new Chess({ fen }).moves({ verbose: true });
      return {
        cp: fixtureCp(fen),
        mate: null,
        pv: fixtureBestLine(fen),
        second: legal.length > 1 ? { cp: fixtureCp(fen) - 25, mate: null } : null,
      };
    },
  };
}

/**
 * How many plies deep the fixture's `Best line` runs, when the Position allows.
 * Deliberately **longer than the client's display cap** (~6 plies): a fixture
 * line shorter than the cap can never exercise the truncation, and the Feature
 * Path found exactly that hole — every stored line was 4 plies, so "the shown
 * line is capped, the stored one is not" was never actually observed on screen.
 */
const FIXTURE_LINE_PLIES = 10;

/**
 * A deterministic legal line from `fen`, in UCI — the `Best line` this fixture
 * would answer for that Position. Exported because every fixture that stands in
 * for an `Analysis pass` (the `Danger position` fixture, the seeds, the test
 * helpers) has to store a line that is *actually playable*, and there is no
 * reason for each of them to invent its own.
 *
 * At each ply the legal move the
 * Position's own hash selects, so the same Position always yields the same line
 * while different Positions generally differ. Stops early on a Position with no
 * legal move (mate/stalemate) — the line is then simply shorter.
 */
export function fixtureBestLine(fen: string): string[] {
  const chess = new Chess({ fen });
  const line: string[] = [];
  for (let ply = 0; ply < FIXTURE_LINE_PLIES; ply++) {
    const legal = chess.moves({ verbose: true });
    if (legal.length === 0) break;
    const move = legal[fixtureHash(chess.fen()) % legal.length];
    chess.move(move.san);
    line.push(`${move.from}${move.to}${move.promotion ?? ""}`);
  }
  return line;
}

/** A stable centipawn score in roughly [-200, 200), derived from the piece
 *  placement (the first FEN field) so it is deterministic per Position. */
function fixtureCp(fen: string): number {
  return fixtureHash(fen) - 200;
}

/** A stable hash of a Position's placement (the first FEN field), in [0, 401). */
function fixtureHash(fen: string): number {
  const placement = fen.split(" ")[0];
  let hash = 0;
  for (let i = 0; i < placement.length; i++) {
    hash = (hash * 31 + placement.charCodeAt(i)) % 401;
  }
  return hash;
}
