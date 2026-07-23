import { describe, it, expect } from "vitest";
import { normalizeResult, toGame } from "../src/import/mapping";
import type { ChessComGame } from "../src/chesscom";

function chessComGame(over: Partial<ChessComGame> = {}): ChessComGame {
  return {
    url: "https://www.chess.com/game/live/1",
    pgn: "1. e4 e5",
    time_class: "blitz",
    rules: "chess",
    end_time: 1704067200, // 2024-01-01T00:00:00Z
    white: { username: "me", result: "win" },
    black: { username: "opp", result: "resigned" },
    ...over,
  };
}

describe("normalizeResult", () => {
  it("maps a win, draw codes, and everything else to win/draw/loss", () => {
    expect(normalizeResult("win")).toBe("win");
    for (const draw of ["agreed", "stalemate", "repetition", "insufficient", "50move", "timevsinsufficient"]) {
      expect(normalizeResult(draw)).toBe("draw");
    }
    for (const loss of ["checkmated", "resigned", "timeout", "abandoned"]) {
      expect(normalizeResult(loss)).toBe("loss");
    }
  });
});

describe("toGame", () => {
  it("records the Player's side, opponent and result when the Player is White", () => {
    const g = toGame(chessComGame(), "me");
    expect(g).toMatchObject({
      gameUrl: "https://www.chess.com/game/live/1",
      opponent: "opp",
      playerColor: "white",
      result: "win",
      date: "2024-01-01",
      timeControlCategory: "blitz",
    });
  });

  it("matches the Player case-insensitively and reads the result from their side (Black loss)", () => {
    const g = toGame(
      chessComGame({
        white: { username: "opp", result: "win" },
        black: { username: "Me", result: "checkmated" },
      }),
      "me",
    );
    expect(g).toMatchObject({ playerColor: "black", opponent: "opp", result: "loss" });
  });

  it("records the Opening from chess.com's ECO/ECOUrl headers (ADR-0007)", () => {
    const g = toGame(
      chessComGame({
        pgn: [
          '[ECO "B22"]',
          '[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Alapin-Variation"]',
          "",
          "1. e4 c5 2. c3",
        ].join("\n"),
      }),
      "me",
    );
    expect(g).toMatchObject({ eco: "B22", openingName: "Sicilian Defense Alapin Variation" });
  });

  it("records the Other opening for a Game chess.com did not classify", () => {
    const g = toGame(chessComGame({ pgn: "1. e4 e5" }), "me");
    expect(g).toMatchObject({ eco: "other", openingName: "Autre / non classée" });
  });
});
