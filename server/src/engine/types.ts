/**
 * The chess `Engine` as a swappable backend (ADR-0008). The analysis / move-quality
 * / Danger-position logic depends only on this interface, never on which backend
 * runs: a fixture fake in tests and the Feature Path, WASM by default at runtime,
 * a native binary when `STOCKFISH_PATH` is set. UCI-shaped: evaluate a FEN to a
 * fixed depth and get back a score plus the best move.
 */
export interface Engine {
  /** Evaluate a Position (FEN) to `depth` half-moves of search. */
  evaluate(fen: string, depth?: number): Promise<EngineEvaluation>;
}

/**
 * One engine `Evaluation` of a Position. Exactly one of `cp` (centipawns,
 * side-to-move relative) or `mate` (signed mate-in-N) is set; the other is null —
 * mirroring UCI's `score cp` / `score mate`. `bestmove` is the engine's chosen
 * move (long-algebraic); Slice A stores only `cp | mate`, not the move.
 */
export interface EngineEvaluation {
  cp: number | null;
  mate: number | null;
  bestmove: string;
}

/** Fixed search depth for the analysis pass (ADR-0008/0009: reproducibility). */
export const ANALYSIS_DEPTH = 16;
