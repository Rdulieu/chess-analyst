import { describe, it, expect } from "vitest";
import { createNativeEngine } from "../src/engine/native";
import { createFixtureEngine } from "../src/engine/fixture";

/** Full FEN of the standard starting Position. */
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
/** The Position after 1. e4. */
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";

describe("fixture Engine", () => {
  it("evaluates a Position to a centipawn score and a best move, without the real Stockfish", async () => {
    const evaluation = await createFixtureEngine().evaluate(START);

    expect(typeof evaluation.cp).toBe("number");
    expect(evaluation.mate).toBeNull();
    expect(evaluation.bestmove).toBeTruthy();
  });

  it("is deterministic — the same Position always evaluates the same", async () => {
    const engine = createFixtureEngine();

    expect(await engine.evaluate(START)).toEqual(await engine.evaluate(START));
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
