import { Worker } from "node:worker_threads";
import type { Engine, EngineEvaluation } from "./types";
import { ANALYSIS_DEPTH } from "./types";

interface PendingRequest {
  resolve: (evaluation: EngineEvaluation) => void;
  reject: (reason: unknown) => void;
}

/**
 * WASM Stockfish `Engine`, the default backend (ADR-0008). Spawns one
 * `worker_thread` (via `worker-bootstrap.mjs` — see its comment on why not
 * `wasm-worker.ts` directly) that stays alive across calls; `evaluate()`
 * posts a request and awaits the matching response, so a depth-16 search
 * runs off the main thread and never blocks Express's event loop.
 */
export function createWasmEngine(): Engine {
  const worker = new Worker(new URL("./worker-bootstrap.mjs", import.meta.url));
  const pending = new Map<number, PendingRequest>();
  let nextId = 0;

  const ready = new Promise<void>((resolve, reject) => {
    worker.once("message", (msg) => {
      if (msg?.ready) resolve();
      else reject(new Error("WASM engine worker failed to boot"));
    });
    worker.once("error", reject);
  });

  worker.on("message", (msg: { id?: number; result?: EngineEvaluation; error?: string; ready?: boolean }) => {
    if (msg.ready || msg.id === undefined) return;
    const request = pending.get(msg.id);
    if (!request) return;
    pending.delete(msg.id);
    if (msg.error) request.reject(new Error(msg.error));
    else request.resolve(msg.result!);
  });

  return {
    async evaluate(fen, depth = ANALYSIS_DEPTH) {
      await ready;
      const id = nextId++;
      return new Promise<EngineEvaluation>((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, fen, depth });
      });
    },
  };
}
