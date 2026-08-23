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
 * mirroring UCI's `score cp` / `score mate`. `pv` is the `Best line` (CONTEXT.md)
 * the search printed, in UCI long-algebraic notation, **whole** — its head is the
 * best move, so there is no separate `bestmove` that could diverge from the line
 * it heads (ADR-0016).
 */
export interface EngineEvaluation {
  cp: number | null;
  mate: number | null;
  /** The `Best line`, whole, in UCI. Its head is the engine's chosen move. */
  pv: string[];
  /**
   * The **score** of the engine's second-best line, when it searched one — never
   * its variation (ADR-0016: the alternative's value is what says whether the
   * best move was forced-good or one of several; its line is not worth storing).
   * `null` when there was no second line to compare, e.g. a single legal move.
   */
  second: { cp: number | null; mate: number | null } | null;
}

/** How many lines the `Analysis pass` asks the engine for (`Search regime`). */
export const ANALYSIS_LINES = 2;

/** Fixed search depth for the analysis pass (ADR-0008/0009: reproducibility). */
export const ANALYSIS_DEPTH = 16;

/**
 * The `Search regime` (CONTEXT.md): what the engine was run under — the depth
 * searched and how many lines. Carried by the `Analysis pass`, so every stored
 * `Evaluation` can be read back to the conditions that produced it, and so that
 * one Game's figures never mix two regimes.
 */
export interface SearchRegime {
  depth: number;
  lines: number;
}

/** The regime this app analyses under today: depth 16, two lines (ADR-0016). */
export const ANALYSIS_REGIME: SearchRegime = { depth: ANALYSIS_DEPTH, lines: ANALYSIS_LINES };
