import { describe, it, expect } from "vitest";
import { materialDelta } from "../src/analysis/material-delta";
import { signature } from "../src/analysis/signature";

describe("materialDelta — the scale, in one place (US-32 slice 07)", () => {
  it("gives the founding case its +1, which is the whole point of ADR-0036", () => {
    // Two rooks (10) against a queen (9). The scalar says « a pawn up » about
    // the Endgame that took 81 % of Game 715's counted damage. Shown, not fixed.
    expect(materialDelta("RR vs Q")).toBe(1);
  });

  it("is signed, and the opponent's side is the negative of the Player's", () => {
    expect(materialDelta("Q vs RR")).toBe(-1);
  });

  it("is zero on an empty board of majors and minors — a value, not an absence", () => {
    expect(materialDelta("— vs —")).toBe(0);
  });

  it("scores Q 9 · R 5 · B 3 · N 3, and nothing else", () => {
    expect(materialDelta("Q vs —")).toBe(9);
    expect(materialDelta("R vs —")).toBe(5);
    expect(materialDelta("B vs —")).toBe(3);
    expect(materialDelta("N vs —")).toBe(3);
    expect(materialDelta("QRBN vs —")).toBe(20);
  });

  it("is zero when both sides hold the same men, however many", () => {
    expect(materialDelta("RRBN vs RRBN")).toBe(0);
  });

  it("moves when a promotion adds material, since it reads the signature", () => {
    // A pawn queens: the Player's side gains a Q, the disagreement gains 9.
    expect(materialDelta("R vs R")).toBe(0);
    expect(materialDelta("QR vs R")).toBe(9);
  });

  it("reads what `signature()` writes, both sides of the board", () => {
    const fen = "3qk3/8/8/8/8/8/8/R3K2R w - - 0 1";
    expect(materialDelta(signature(fen, "white"))).toBe(1);
    expect(materialDelta(signature(fen, "black"))).toBe(-1);
  });
});
