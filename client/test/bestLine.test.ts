import { describe, it, expect } from "vitest";
import { readBestLine, DISPLAYED_PLIES } from "../src/chess/bestLine";

/** The Position after 1. e4 — Black to move. */
const AFTER_E4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";

describe("readBestLine", () => {
  it("reads a UCI line as Moves the Player can recognise, in notation", () => {
    const line = readBestLine(AFTER_E4, ["e7e5", "g1f3", "b8c6"]);

    // UCI is what the engine speaks; SAN is what a chess player reads.
    expect(line.map((ply) => ply.san)).toEqual(["e5", "Nf3", "Nc6"]);
  });

  it("gives each ply the Position it leads to, so pointing at it can be shown on a board", () => {
    const line = readBestLine(AFTER_E4, ["e7e5", "g1f3"]);

    // Replaying the first k Moves of the line from the displayed Position — no
    // tree, no branch, no stored variation.
    expect(line[0].fen).toContain(" w ");
    expect(line[1].fen).not.toBe(line[0].fen);
  });

  it("names the squares of each Move, so the first one can be drawn as an arrow", () => {
    const line = readBestLine(AFTER_E4, ["e7e5"]);

    expect(line[0]).toMatchObject({ from: "e7", to: "e5" });
  });

  it("shows only the first plies of a long line — the display is capped, the storage never is", () => {
    // A line the engine printed whole: depth 16 yields far more plies than are
    // worth reading, and the tail is engine noise rather than instruction.
    const long = ["e7e5", "g1f3", "b8c6", "f1b5", "g8f6", "e1g1", "f6e4", "d2d4"];

    const line = readBestLine(AFTER_E4, long);

    expect(long.length).toBeGreaterThan(DISPLAYED_PLIES);
    expect(line).toHaveLength(DISPLAYED_PLIES);
  });

  it("stops rather than lying when a line is not playable from the Position", () => {
    // Defensive: a line stored against another Position would otherwise be shown
    // as if it were a continuation of this one.
    expect(readBestLine(AFTER_E4, ["e2e4"])).toEqual([]);
    expect(readBestLine(AFTER_E4, ["e7e5", "e7e5"]).map((p) => p.san)).toEqual(["e5"]);
  });

  it("reads an empty line as nothing to show", () => {
    expect(readBestLine(AFTER_E4, [])).toEqual([]);
  });
});
