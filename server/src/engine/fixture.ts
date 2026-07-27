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
 */
export function createFixtureEngine(): Engine {
  return {
    async evaluate(fen) {
      return { cp: fixtureCp(fen), mate: null, bestmove: "e2e4" };
    },
  };
}

/** A stable centipawn score in roughly [-200, 200), derived from the piece
 *  placement (the first FEN field) so it is deterministic per Position. */
function fixtureCp(fen: string): number {
  const placement = fen.split(" ")[0];
  let hash = 0;
  for (let i = 0; i < placement.length; i++) {
    hash = (hash * 31 + placement.charCodeAt(i)) % 401;
  }
  return hash - 200;
}
