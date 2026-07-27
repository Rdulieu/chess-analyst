/**
 * Minimal ambient typing for the `stockfish` npm package (nmrugg/stockfish.js):
 * it ships no type declarations. Only the surface `wasm-worker.ts` actually
 * uses — `initEngine(variant)` resolving to an object driven via
 * `sendCommand`/`listener` — is declared.
 */
declare module "stockfish" {
  interface StockfishWasmEngine {
    sendCommand(command: string): void;
    listener?: (line: string) => void;
    terminate(): void;
  }

  function initEngine(enginePath?: string): Promise<StockfishWasmEngine>;

  export default initEngine;
}
