/**
 * Manual verification for the WASM Stockfish backend — run explicitly via
 * `tsx src/engine/verify-wasm.ts`, never part of `npm test` (the real engine
 * must never run in the automated suite, ADR-0008). Evaluates the starting
 * Position and a known mate-in-1 to prove the worker_thread wiring actually
 * produces real Stockfish evaluations, not just that it boots.
 */
import { createWasmEngine } from "./wasm";
import { ANALYSIS_DEPTH } from "./types";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
/** White king b6, White rook h1, Black king b8: 1. Rh8# is mate-in-1 for White. */
const MATE_IN_1 = "1k6/8/1K6/8/8/8/8/7R w - - 0 1";

async function main() {
  const engine = createWasmEngine();

  console.log(`Evaluating starting position at depth ${ANALYSIS_DEPTH}...`);
  console.log(await engine.evaluate(START, ANALYSIS_DEPTH));

  console.log(`Evaluating mate-in-1 position at depth ${ANALYSIS_DEPTH}...`);
  console.log(await engine.evaluate(MATE_IN_1, ANALYSIS_DEPTH));

  process.exit(0);
}

main().catch((err) => {
  console.error("WASM verification failed:", err);
  process.exit(1);
});
