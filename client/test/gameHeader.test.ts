import { describe, it, expect } from "vitest";
import { gameHeader } from "../src/features/games/gameHeader";
import { OPERA_GAME } from "./fixtures";

describe("gameHeader", () => {
  it("lists White first, then Black, with the name each side carries in the PGN", () => {
    const { sides } = gameHeader(OPERA_GAME);

    expect(sides.map((s) => s.color)).toEqual(["white", "black"]);
    expect(sides.map((s) => s.name)).toEqual(["Paul Morphy", "Duke Karl / Count Isouard"]);
  });

  it("marks the side the Player played, and only that one", () => {
    const asWhite = gameHeader({ ...OPERA_GAME, playerColor: "white" });
    expect(asWhite.sides.map((s) => s.isPlayer)).toEqual([true, false]);

    const asBlack = gameHeader({ ...OPERA_GAME, playerColor: "black" });
    expect(asBlack.sides.map((s) => s.isPlayer)).toEqual([false, true]);
  });

  it("carries the result unchanged — it is already stated from the Player's side", () => {
    expect(gameHeader({ ...OPERA_GAME, result: "loss" }).result).toBe("loss");
    expect(gameHeader({ ...OPERA_GAME, result: "draw" }).result).toBe("draw");
  });

  it("carries the date and the time control category", () => {
    const header = gameHeader({ ...OPERA_GAME, date: "2026-06-04", timeControlCategory: "blitz" });

    expect(header.date).toBe("2026-06-04");
    expect(header.timeControlCategory).toBe("blitz");
  });

  it("carries the Opening when the platform classified the Game", () => {
    const header = gameHeader({
      ...OPERA_GAME,
      eco: "B22",
      openingName: "Sicilian Defense: Alapin Variation",
    });

    expect(header.opening).toEqual({ eco: "B22", name: "Sicilian Defense: Alapin Variation" });
  });

  it("has no Opening for a Game the platform did not classify", () => {
    expect(gameHeader({ ...OPERA_GAME, eco: null, openingName: null }).opening).toBeNull();
  });

  it("has no Opening when only half the classification came back", () => {
    expect(gameHeader({ ...OPERA_GAME, eco: "B22", openingName: null }).opening).toBeNull();
  });

  it("falls back to the stored opponent when the PGN names no opponent", () => {
    const header = gameHeader({
      ...OPERA_GAME,
      pgn: "1. e4 e5 *",
      playerColor: "white",
      opponent: "Bob",
    });

    expect(header.sides.find((s) => !s.isPlayer)?.name).toBe("Bob");
  });
});
