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
 *
 * **An unusable backend must not take the app down.** A path that does not
 * exist, or a binary that spawns and then dies, used to kill the process at
 * startup (`ENOENT`, then `EPIPE` on the first write) — before any pass could
 * exist, so the Player got a dead app instead of a failed `Analysis pass`. Those
 * failures are captured and surfaced through `evaluate`, which is what turns
 * them into a `failed` outcome the Player can actually read (US-8).
 */
export function createNativeEngine(path: string): Engine {
  const child = spawn(path, [], { stdio: "pipe" });

  /** Set once the backend is known to be unusable; every evaluate then rejects. */
  let broken: Error | null = null;
  const fail = (reason: string) => {
    broken ??= new Error(`Moteur ${path} indisponible : ${reason}`);
  };

  child.on("error", (err) => fail(err.message));
  // Writing to a process that already died raises EPIPE on the stream, which is
  // an unhandled 'error' event — i.e. a crash — unless it is listened for.
  child.stdin.on("error", (err: Error) => fail(err.message));
  child.on("exit", (code, signal) =>
    fail(`le processus s'est arrêté (${signal ?? `code ${code}`}) avant de répondre`),
  );

  const lineHandlers = new Set<(line: string) => void>();
  createInterface({ input: child.stdout }).on("line", (line) => {
    for (const handler of lineHandlers) handler(line);
  });

  const driver = createUciDriver({
    send: (command) => {
      if (broken) throw broken;
      child.stdin.write(command + "\n");
    },
    onLine: (handler) => {
      lineHandlers.add(handler);
      return () => lineHandlers.delete(handler);
    },
  });
  const ready = driver.initialize().catch((err: unknown) => {
    fail(err instanceof Error ? err.message : String(err));
  });

  return {
    async evaluate(fen, depth = ANALYSIS_DEPTH) {
      // A backend that never answers would otherwise leave the pass running
      // forever, with nothing to show the Player: wait for the handshake *or*
      // for the failure, whichever comes first.
      await Promise.race([ready, rejectsWhenBroken()]);
      if (broken) throw broken;
      return driver.evaluate(fen, depth);
    },
  };

  /** Resolves as soon as the backend is known to be broken. */
  function rejectsWhenBroken(): Promise<void> {
    return new Promise((resolve) => {
      const tick = setInterval(() => {
        if (broken) {
          clearInterval(tick);
          resolve();
        }
      }, 20);
      tick.unref?.();
    });
  }
}
