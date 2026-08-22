import { describe, it, expect } from "vitest";
import { Chess } from "cm-chess";
import { createNativeEngine } from "../src/engine/native";
import { createFixtureEngine } from "../src/engine/fixture";
import { createUciDriver } from "../src/engine/uci-driver";

/** Full FEN of the standard starting Position. */
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
/** The Position after 1. e4. */
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

describe("fixture Engine", () => {
  it("evaluates a Position to a centipawn score and a best move, without the real Stockfish", async () => {
    const evaluation = await createFixtureEngine().evaluate(START);

    expect(typeof evaluation.cp).toBe("number");
    expect(evaluation.mate).toBeNull();
    expect(evaluation.pv.length).toBeGreaterThan(0);
  });

  it("is deterministic — the same Position always evaluates the same", async () => {
    const engine = createFixtureEngine();

    expect(await engine.evaluate(START)).toEqual(await engine.evaluate(START));
  });

  it("yields a best line that is actually playable from the Position", async () => {
    // The line is drawn on the board and replayed move by move for the preview,
    // so a fixture line that is not legal there would make the Feature Path show
    // an arrow to nowhere. Legality is the fixture's contract, not decoration.
    const evaluation = await createFixtureEngine().evaluate(AFTER_E4);

    const chess = new Chess(AFTER_E4);
    expect(evaluation.pv.length).toBeGreaterThan(1);
    for (const uci of evaluation.pv) {
      expect(chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4) })).toBeTruthy();
    }
  });

  it("gives different Positions different scores", async () => {
    const engine = createFixtureEngine();

    const start = await engine.evaluate(START);
    const afterE4 = await engine.evaluate(AFTER_E4);
    expect(start.cp).not.toBe(afterE4.cp);
  });
});

describe("native Engine — an unusable backend", () => {
  it("surfaces the failure through evaluate, instead of taking the process down at construction", async () => {
    // A path that cannot be a UCI engine. Building the Engine must not throw,
    // and must not kill the app: the relay has to stay up so the Player is told
    // the *pass* failed (US-8) rather than losing the whole app.
    const engine = createNativeEngine("/nonexistent/stockfish");

    await expect(engine.evaluate("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 1))
      .rejects.toThrow();
  });

  it("does the same for a binary that spawns but speaks no UCI", async () => {
    const engine = createNativeEngine("/bin/false");

    await expect(engine.evaluate("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 1))
      .rejects.toThrow();
  });
});

/**
 * A scripted `UciTransport`: it answers the handshake, then replies to each `go`
 * with the lines given to it — the real backends' own output, captured. Lets the
 * driver be tested on what a search actually prints, with no Stockfish involved.
 */
function scriptedTransport(searchOutput: string[]) {
  const handlers = new Set<(line: string) => void>();
  const commands: string[] = [];
  const emit = (lines: string[]) => {
    for (const line of lines) for (const handler of [...handlers]) handler(line);
  };
  return {
    commands,
    transport: {
      send(command: string) {
        commands.push(command);
        if (command === "uci") emit(["id name Scripted", "uciok"]);
        else if (command === "isready") emit(["readyok"]);
        else if (command.startsWith("go")) emit(searchOutput);
      },
      onLine(handler: (line: string) => void) {
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
    },
  };
}

describe("UCI driver — what a search yields", () => {
  it("keeps the whole best line the engine printed, not just its first move", async () => {
    const { transport } = scriptedTransport([
      "info depth 15 multipv 1 score cp 28 pv e2e4 e7e5 g1f3",
      "info depth 16 multipv 1 score cp 31 pv d2d4 d7d5 c2c4 e7e6",
      "bestmove d2d4",
    ]);
    const driver = createUciDriver(transport);
    await driver.initialize();

    const evaluation = await driver.evaluate(START, 16);

    expect(evaluation.pv).toEqual(["d2d4", "d7d5", "c2c4", "e7e6"]);
  });
});

describe("UCI driver — the second line", () => {
  it("asks for two lines and yields the second one's score, without its variation", async () => {
    const { commands, transport } = scriptedTransport([
      "info depth 16 multipv 1 score cp 31 pv d2d4 d7d5",
      "info depth 16 multipv 2 score cp 12 pv e2e4 e7e5",
      "bestmove d2d4",
    ]);
    const driver = createUciDriver(transport);
    await driver.initialize();

    const evaluation = await driver.evaluate(START, 16);

    expect(commands).toContain("setoption name MultiPV value 2");
    expect(evaluation.pv).toEqual(["d2d4", "d7d5"]);
    expect(evaluation.cp).toBe(31);
    expect(evaluation.second).toEqual({ cp: 12, mate: null });
  });

  it("reports no second line at all when the Position has a single legal move", async () => {
    const { transport } = scriptedTransport([
      "info depth 16 multipv 1 score mate 1 pv h4h7",
      "bestmove h4h7",
    ]);
    const driver = createUciDriver(transport);
    await driver.initialize();

    const evaluation = await driver.evaluate(START, 16);

    // Distinguishable from a missing datum: `null` says the engine had nothing
    // to compare, not that we forgot to read it.
    expect(evaluation.second).toBeNull();
    expect(evaluation.mate).toBe(1);
  });
});
