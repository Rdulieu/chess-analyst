import { describe, it, expect } from "vitest";
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
