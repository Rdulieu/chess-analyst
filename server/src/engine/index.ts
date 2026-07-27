import type { Engine } from "./types";
import { createFixtureEngine } from "./fixture";
import { createNativeEngine } from "./native";
import { createWasmEngine } from "./wasm";

export type { Engine, EngineEvaluation } from "./types";
export { ANALYSIS_DEPTH } from "./types";
export { createFixtureEngine } from "./fixture";

/**
 * Selects the engine backend at runtime (ADR-0008), mirroring how
 * `CHESSCOM_BASE_URL` selects a chess.com fixture archive:
 *
 * - `ENGINE_BACKEND=fixture` → the deterministic fake (lower tests, Feature Path);
 * - `STOCKFISH_PATH` set → native Stockfish over UCI;
 * - otherwise → WASM Stockfish in a `worker_thread` (default).
 */
export function createEngine(): Engine {
  if (process.env.ENGINE_BACKEND === "fixture") return createFixtureEngine();
  if (process.env.STOCKFISH_PATH) return createNativeEngine(process.env.STOCKFISH_PATH);
  return createWasmEngine();
}
