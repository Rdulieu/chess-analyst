import { describe, it, expect } from "vitest";
import { toImportedGame, monthWindow } from "../src/platform/lichess/mapping";
import type { LichessGame } from "../src/platform/lichess/payload";

/**
 * The Lichess half of ADR-0016: a pure translation, tested as a pure function.
 * The richest trap in this feature is asserting on payload shapes — those are
 * precisely what the port exists to hide — so every case below states an
 * externally observable fact about the `Game` that comes out.
 */

function lichessGame(over: Partial<LichessGame> = {}): LichessGame {
  return {
    id: "abcd1234",
    speed: "blitz",
    variant: "standard",
    createdAt: Date.UTC(2024, 0, 15, 10, 30),
    winner: "white",
    players: { white: { user: { name: "Metalyst" } }, black: { user: { name: "opp" } } },
    opening: { eco: "B22", name: "Sicilian Defense: Alapin Variation" },
    pgn: "1. e4 c5 2. c3",
    ...over,
  };
}

describe("the Lichess translation", () => {
  it("records the Player's side, opponent and result — the opponent's name being nested", () => {
    const g = toImportedGame(lichessGame(), "metalyst");

    expect(g).toMatchObject({
      gameUrl: "https://lichess.org/abcd1234",
      opponent: "opp",
      playerColor: "white",
      result: "win",
      timeControlCategory: "blitz",
      pgn: "1. e4 c5 2. c3",
    });
  });

  it("matches the Player case-insensitively and reads the result from the winning colour", () => {
    const g = toImportedGame(
      lichessGame({
        winner: "white",
        players: { white: { user: { name: "opp" } }, black: { user: { name: "METALYST" } } },
      }),
      "Metalyst",
    );

    expect(g).toMatchObject({ playerColor: "black", opponent: "opp", result: "loss" });
  });

  it("reads no winner as a draw — Lichess names a winner or nothing at all", () => {
    const g = toImportedGame(lichessGame({ winner: undefined }), "Metalyst");

    expect(g.result).toBe("draw");
  });

  it("folds `ultraBullet` into bullet, so those games are studied rather than dropped", () => {
    expect(toImportedGame(lichessGame({ speed: "ultraBullet" }), "Metalyst").timeControlCategory).toBe(
      "bullet",
    );
  });

  it("keeps the four paces the two vocabularies already share, `classical` included", () => {
    for (const speed of ["bullet", "blitz", "rapid", "classical", "correspondence"] as const) {
      expect(toImportedGame(lichessGame({ speed }), "Metalyst").timeControlCategory).toBe(speed);
    }
  });

  it("takes the Opening from Lichess's own structured field, not from the PGN (ADR-0007)", () => {
    const g = toImportedGame(lichessGame(), "Metalyst");

    expect(g).toMatchObject({ eco: "B22", openingName: "Sicilian Defense: Alapin Variation" });
  });

  it("files a Game Lichess did not classify under the Other opening, so the totals stay honest", () => {
    const g = toImportedGame(lichessGame({ opening: undefined }), "Metalyst");

    expect(g).toMatchObject({ eco: "other", openingName: "Autre / non classée" });
  });

  it("dates a Game by when it STARTED, because that is what the export filters on", () => {
    // A game started 2024-08-27 and finished in September is returned by
    // August's window. Dating it by its end would let a month's import fetch a
    // Game and file it under another month — so importing that month alone would
    // silently miss it. Only correspondence games straddle a boundary at all,
    // which is precisely where the loss would go unnoticed.
    const g = toImportedGame(
      lichessGame({ speed: "correspondence", createdAt: Date.UTC(2024, 7, 27, 22, 0) }),
      "Metalyst",
    );

    expect(g.date).toBe("2024-08-27");
  });
});

describe("a month as Lichess is asked for it", () => {
  it("becomes the month's UTC boundaries in epoch milliseconds", () => {
    // The month is OUR unit (ADR-0016): Lichess takes an instant range, so the
    // conversion is where the two meet — and it must be UTC, or a Player's games
    // shift by hours across a boundary depending on where the machine sits.
    expect(monthWindow(2024, 1)).toEqual({
      since: Date.UTC(2024, 0, 1, 0, 0, 0, 0),
      until: Date.UTC(2024, 1, 1, 0, 0, 0, 0) - 1,
    });
  });

  it("rolls over the year at December, rather than asking for a thirteenth month", () => {
    expect(monthWindow(2024, 12)).toEqual({
      since: Date.UTC(2024, 11, 1, 0, 0, 0, 0),
      until: Date.UTC(2025, 0, 1, 0, 0, 0, 0) - 1,
    });
  });
});
