import type { EngineEvaluation } from "./types";

/**
 * The transport a `UciDriver` speaks over — a raw line-in/line-out UCI
 * connection. WASM (in-process `sendCommand`/`listener`) and native
 * (`child_process` stdin/stdout) are both just a `UciTransport`, so the same
 * driver below is "the same UCI driver" for both backends (ADR-0008).
 */
export interface UciTransport {
  send(command: string): void;
  /** Registers a line handler; returns an unsubscribe function. */
  onLine(handler: (line: string) => void): () => void;
}

/** Drives one UCI connection: handshake once, then evaluate FENs on demand. */
export interface UciDriver {
  /** `uci` / `isready` handshake; call once before the first `evaluate`. */
  initialize(): Promise<void>;
  evaluate(fen: string, depth: number): Promise<EngineEvaluation>;
}

export function createUciDriver(transport: UciTransport): UciDriver {
  /** Sends `command`, collecting lines until one satisfies `isLast`. */
  function sendUntil(command: string, isLast: (line: string) => boolean): Promise<string[]> {
    return new Promise((resolve) => {
      const collected: string[] = [];
      const unsubscribe = transport.onLine((line) => {
        collected.push(line);
        if (isLast(line)) {
          unsubscribe();
          resolve(collected);
        }
      });
      transport.send(command);
    });
  }

  return {
    async initialize() {
      await sendUntil("uci", (line) => line === "uciok");
      await sendUntil("isready", (line) => line === "readyok");
    },

    async evaluate(fen, depth) {
      transport.send(`position fen ${fen}`);
      const lines = await sendUntil(`go depth ${depth}`, (line) => line.startsWith("bestmove"));
      return parseEvaluation(lines);
    },
  };
}

/** Reads the last `score cp`/`score mate` and the `bestmove` out of a search's `info`/`bestmove` lines. */
function parseEvaluation(lines: string[]): EngineEvaluation {
  let cp: number | null = null;
  let mate: number | null = null;
  let bestmove = "";

  for (const line of lines) {
    const score = line.match(/score (cp|mate) (-?\d+)/);
    if (score) {
      cp = score[1] === "cp" ? Number(score[2]) : null;
      mate = score[1] === "mate" ? Number(score[2]) : null;
    }
    const bestmoveMatch = line.match(/^bestmove (\S+)/);
    if (bestmoveMatch) bestmove = bestmoveMatch[1];
  }

  return { cp, mate, bestmove };
}
