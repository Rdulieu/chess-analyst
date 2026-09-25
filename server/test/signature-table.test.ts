import { describe, it, expect } from "vitest";
import { crossedSignatures } from "../src/analysis/crossed";
import { SIGNATURE_THRESHOLD, signatureTable } from "../src/stats/signatures";

/**
 * FABRICATED fixtures, and named as such (US-32 spec, « réserve d'honnêteté ») —
 * the base's own Games are replayed by `stats.test.ts` and by `phase.test.ts`;
 * what is pinned here is the fold, which needs configurations that repeat a
 * chosen number of times and cannot wait for a corpus to supply them.
 */
const crossing = (result: "win" | "draw" | "loss", ...signatures: string[]) => ({
  result,
  signatures,
});

describe("crossedSignatures", () => {
  it("yields the SET of signatures the Endgame plies crossed, once each", () => {
    // Two rooks each, then one pair trades off: two configurations, and the
    // first one is held for several plies without being counted twice.
    const fens = [
      "4k3/8/8/8/8/8/8/R3K2R w - - 0 1",
      "4k3/8/8/8/8/8/8/R3K2R b - - 0 1",
      "4k3/8/8/8/8/8/8/4K2R w - - 0 1",
    ];
    expect(crossedSignatures(fens, "white")).toEqual(["RR vs —", "R vs —"]);
  });

  it("is empty for a Game that never reaches the Endgame", () => {
    expect(crossedSignatures(["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"], "white"))
      .toEqual([]);
  });

  it("reads the configuration from the Player's side, opponent second", () => {
    const fens = ["4k3/8/8/8/8/8/8/R3K2R w - - 0 1", "3qk3/8/8/8/8/8/8/R3K2R b - - 0 1"];
    expect(crossedSignatures(fens, "black")).toEqual(["— vs RR", "Q vs RR"]);
  });
});

describe("signatureTable", () => {
  it("counts a Game we could not replay apart, never as one without an Endgame", () => {
    const table = signatureTable([
      crossing("win", "RR vs Q"),
      { result: "loss", signatures: [], unreadable: true },
      crossing("draw"),
    ]);

    expect(table.scope).toEqual({ games: 3, withEndgame: 1, withoutEndgame: 1, unreadable: 1 });
  });

  it("counts a Game once per configuration it crossed, in results", () => {
    const table = signatureTable([
      crossing("win", "RR vs Q", "R vs Q"),
      crossing("loss", "RR vs Q"),
      crossing("draw", "RR vs Q"),
    ]);

    expect(table.rows).toEqual([
      { signature: "RR vs Q", games: 3, win: 1, draw: 1, loss: 1, winRate: 0.5 },
    ]);
  });

  it("keeps a configuration from three Games and relegates what is below", () => {
    const table = signatureTable([
      crossing("win", "RR vs Q", "R vs —"),
      crossing("loss", "RR vs Q", "R vs —"),
      crossing("loss", "RR vs Q", "B vs N"),
    ]);

    expect(SIGNATURE_THRESHOLD).toBe(3);
    expect(table.threshold).toBe(3);
    expect(table.rows.map((r) => r.signature)).toEqual(["RR vs Q"]);
    // Named, not erased: two configurations stayed under the bar.
    expect(table.below.configurations).toBe(2);
  });

  it("announces its scope: the Games it covers and those with no Endgame at all", () => {
    const table = signatureTable([
      crossing("win", "RR vs Q"),
      crossing("loss"),
      crossing("draw"),
    ]);

    expect(table.scope).toEqual({ games: 3, withEndgame: 1, withoutEndgame: 2, unreadable: 0 });
  });

  it("brings the terrain the Player lives on to the top — most played first, then losses", () => {
    const table = signatureTable([
      crossing("loss", "RR vs Q", "R vs R"),
      crossing("loss", "RR vs Q", "R vs R"),
      crossing("loss", "RR vs Q"),
      crossing("win", "R vs R"),
      crossing("win", "R vs R"),
      crossing("draw", "B vs N", "R vs R"),
      crossing("draw", "B vs N"),
      crossing("draw", "B vs N"),
    ]);

    // `R vs R` (5 Games) above the two seen 3 times; that tie breaks on defeats,
    // so `RR vs Q` (3 losses) comes before `B vs N` (none). The costliest row is
    // no longer first — it is the most frequent, which is the point of the order.
    expect(table.rows.map((r) => r.signature)).toEqual(["R vs R", "RR vs Q", "B vs N"]);
  });

  it("is empty, and says so in its scope, on a history with no Endgame", () => {
    const table = signatureTable([crossing("win"), crossing("loss")]);
    expect(table.rows).toEqual([]);
    expect(table.below.configurations).toBe(0);
    expect(table.scope).toEqual({ games: 2, withEndgame: 0, withoutEndgame: 2, unreadable: 0 });
  });
});
