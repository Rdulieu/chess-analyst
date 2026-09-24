import { describe, it, expect } from "vitest";
import { signature } from "../src/analysis/signature";

/**
 * A `Material signature` is read from a FEN alone (ADR-0036), so every fixture
 * here is a **FABRICATED** placement: the base's 78 analysed Games cover the
 * ordinary configurations and none of the awkward ones this seam exists for —
 * the empty side, the FEN that lists pieces out of order, and the promotion
 * that *adds* a major.
 *
 * The side to move and the counters are irrelevant to the reading and are kept
 * only so the strings are real FENs.
 */
const fen = (placement: string) => `${placement} w - - 0 1`;

describe("Material signature — the Player's majors and minors against the opponent's", () => {
  it("writes the Player's side first, the opponent's after", () => {
    // Two rooks against a queen: the configuration that opened US-32. FABRICATED.
    const board = fen("3qk3/8/8/8/8/8/8/R3K2R");

    expect(signature(board, "white")).toBe("RR vs Q");
    expect(signature(board, "black")).toBe("Q vs RR");
  });

  it("orders each side `Q R B N`, whatever order the FEN lists the men in", () => {
    // Black's back rank as the FEN writes it — n, b, q, b, n, r — must read QRBBNN.
    // FABRICATED.
    expect(signature(fen("1nbqkbnr/8/8/8/8/8/8/4K3"), "black")).toBe("QRBBNN vs —");
  });

  it("counts neither kings nor pawns", () => {
    // Nothing but kings and pawns left: both sides are empty. FABRICATED.
    expect(signature(fen("4k3/pppppppp/8/8/8/PPPPPPPP/8/4K3"), "white")).toBe("— vs —");
  });

  it("writes an empty side `—`, so a side with nothing left is still said", () => {
    expect(signature(fen("4k3/8/8/8/8/8/8/3QKBNR"), "white")).toBe("QRBN vs —");
    expect(signature(fen("4k3/8/8/8/8/8/8/3QKBNR"), "black")).toBe("— vs QRBN");
  });

  it("follows a promotion, which ADDS a major to the signature", () => {
    // A pawn on the seventh, then the queen it became. FABRICATED, and the one
    // case the Endgame's latching exists for (ADR-0035).
    expect(signature(fen("4k3/P7/8/8/8/8/8/4K3"), "white")).toBe("— vs —");
    expect(signature(fen("Q3k3/8/8/8/8/8/8/4K3"), "white")).toBe("Q vs —");
  });

  it("gives one configuration one writing and one only", () => {
    // The same material, reached by two different placements, is the same
    // signature — which is what lets it be a bucket key. FABRICATED.
    expect(signature(fen("4k3/8/8/8/6b1/8/8/R3K1R1"), "white")).toBe(
      signature(fen("4k3/8/8/1b6/8/8/8/1R2K2R"), "white"),
    );
  });
});
