import { parentPort, isMainThread } from "node:worker_threads";
import { createRequire } from "node:module";
import initEngine from "stockfish";
import { createUciDriver } from "./uci-driver";
import { ANALYSIS_DEPTH } from "./types";

/**
 * A CJS `require` handle on the `worker_threads` core module. Needed only to
 * flip `isMainThread` around the `initEngine()` call below — mutating it via
 * the ESM named import (`isMainThread`) doesn't work: ESM namespace bindings
 * are read-only, while the CJS module object `require("worker_threads")`
 * returns (the one `stockfish`'s own internal `require` call also resolves
 * to — core modules are a single shared object) is a plain mutable object.
 */
const workerThreadsModule = createRequire(import.meta.url)("node:worker_threads") as { isMainThread: boolean };

/** One `evaluate` request posted from the main thread (`wasm.ts`). */
interface EvaluateRequest {
  id: number;
  fen: string;
  depth?: number;
}

/**
 * Runs inside a `worker_thread` (ADR-0008): this is where the blocking WASM
 * search actually happens, so it never ties up Express's event loop. Loaded
 * via `worker-bootstrap.mjs` (`tsImport`), never imported directly by
 * `new Worker()` — see that file's comment for why.
 *
 * `lite-single` is the ~7MB single-threaded WASM build (matches ADR-0008's
 * default-backend sizing); `initEngine`'s own default picks the much larger
 * multi-threaded "full" build instead.
 *
 * The `stockfish` package's bin files decide how to export themselves by
 * checking `worker_threads.isMainThread` to detect "am I a browser Web
 * Worker" — when it's `false` they take a branch built for browser worker
 * globals (`self`/`onmessage`) and never reach their own `module.exports =
 * <engine factory>` line, so `initEngine()` fails with "Could not load the
 * engine correctly" the moment it's actually called from inside a genuine
 * Node worker_thread (verified empirically — this is a real gap in the
 * package's env detection, not a sandbox artifact). `isMainThread` is
 * writable/configurable at runtime, so flipping it back to `true` for the
 * duration of the `initEngine()` call routes the package through its normal
 * Node-library export path instead; nothing past that call depends on it.
 */
async function main() {
  if (!parentPort) throw new Error("wasm-worker.ts must run inside a worker_thread");

  workerThreadsModule.isMainThread = true;
  const engine = await initEngine("lite-single");
  workerThreadsModule.isMainThread = isMainThread;

  const lineHandlers = new Set<(line: string) => void>();
  engine.listener = (line) => {
    for (const handler of lineHandlers) handler(line);
  };

  const driver = createUciDriver({
    send: (command) => engine.sendCommand(command),
    onLine: (handler) => {
      lineHandlers.add(handler);
      return () => lineHandlers.delete(handler);
    },
  });
  await driver.initialize();

  parentPort.on("message", async (request: EvaluateRequest) => {
    try {
      const result = await driver.evaluate(request.fen, request.depth ?? ANALYSIS_DEPTH);
      parentPort!.postMessage({ id: request.id, result });
    } catch (err) {
      parentPort!.postMessage({ id: request.id, error: err instanceof Error ? err.message : String(err) });
    }
  });

  parentPort.postMessage({ ready: true });
}

main();
