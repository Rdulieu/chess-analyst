import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { Engine } from "./types";
import { ANALYSIS_DEPTH } from "./types";
import { createUciDriver } from "./uci-driver";

/**
 * Native Stockfish `Engine`, opt-in via `STOCKFISH_PATH` (ADR-0008). Drives
 * the binary over UCI through the same `UciDriver` as the WASM backend —
 * only the transport (stdin/stdout of a spawned process, vs. an in-process
 * `sendCommand`/`listener`) differs.
 */
export function createNativeEngine(path: string): Engine {
  const child = spawn(path, [], { stdio: "pipe" });
  const lineHandlers = new Set<(line: string) => void>();
  createInterface({ input: child.stdout }).on("line", (line) => {
    for (const handler of lineHandlers) handler(line);
  });

  const driver = createUciDriver({
    send: (command) => child.stdin.write(command + "\n"),
    onLine: (handler) => {
      lineHandlers.add(handler);
      return () => lineHandlers.delete(handler);
    },
  });
  const ready = driver.initialize();

  return {
    async evaluate(fen, depth = ANALYSIS_DEPTH) {
      await ready;
      return driver.evaluate(fen, depth);
    },
  };
}
