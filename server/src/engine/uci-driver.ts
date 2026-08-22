import type { EngineEvaluation } from "./types";
import { ANALYSIS_LINES } from "./types";

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
      // Two lines, so every Evaluation carries what the *alternative* was worth
      // (ADR-0016). Set once, at the handshake: the regime is a property of the
      // whole pass, not something a single search negotiates.
      transport.send(`setoption name MultiPV value ${ANALYSIS_LINES}`);
      await sendUntil("isready", (line) => line === "readyok");
    },

    async evaluate(fen, depth) {
      transport.send(`position fen ${fen}`);
      const lines = await sendUntil(`go depth ${depth}`, (line) => line.startsWith("bestmove"));
      return parseEvaluation(lines);
    },
  };
}

/**
 * Reads a search's `info` lines into an `EngineEvaluation`: the deepest line's
 * score, and its `pv` — the `Best line`, whole. The variation was always in the
 * output and used to be dropped at parse time; keeping it costs no engine time
 * (ADR-0016).
 */
function parseEvaluation(lines: string[]): EngineEvaluation {
  let cp: number | null = null;
  let mate: number | null = null;
  let pv: string[] = [];
  let second: EngineEvaluation["second"] = null;

  for (const line of lines) {
    if (!line.startsWith("info ")) continue;
    const score = line.match(/score (cp|mate) (-?\d+)/);
    if (!score) continue;
    const value = {
      cp: score[1] === "cp" ? Number(score[2]) : null,
      mate: score[1] === "mate" ? Number(score[2]) : null,
    };
    const variation = line.match(/ pv ((?:[a-h][1-8][a-h][1-8][qrbn]?(?: |$))+)/);

    // `multipv` numbers the lines of one search; its absence means a single-line
    // search, which is the first line by definition. Later `info` lines are
    // deeper, so each simply overwrites the one before for its own rank.
    const rank = Number(line.match(/ multipv (\d+)/)?.[1] ?? 1);
    if (rank === 1) {
      cp = value.cp;
      mate = value.mate;
      if (variation) pv = variation[1].trim().split(" ");
    } else if (rank === 2) {
      second = value;
    }
  }

  return { cp, mate, pv, second };
}
