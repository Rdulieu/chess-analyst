import { beforeEach, describe, it, expect } from "vitest";
import {
  engineWasSeen,
  noteEngineShown,
  showsEngine,
} from "../src/features/personal/engineSeen";

beforeEach(() => localStorage.clear());

/**
 * The **provenance** rule (CONTEXT.md, `Personal analysis`), on the model of
 * `reviewMode.ts`: one rule, a couple of functions, tested with no rendering at
 * all. It answers one question — *had the engine's findings already been shown
 * for this Game?* — and it is deliberately the only place that question is
 * decided.
 */
describe("whether the engine has been shown for a Game", () => {
  it("says no about a Game nobody has looked at", () => {
    expect(engineWasSeen(7)).toBe(false);
  });

  it("remembers a Game the engine was shown for", () => {
    noteEngineShown(7);

    expect(engineWasSeen(7)).toBe(true);
  });

  it("is per Game, not per session: seeing one says nothing about another", () => {
    noteEngineShown(7);

    // The whole point of the flag. A reading labelled "informed" because the
    // Player once looked at a *different* Game would be a lie about this one.
    expect(engineWasSeen(8)).toBe(false);
  });

  it("keeps every Game it has been told about, not just the last", () => {
    noteEngineShown(7);
    noteEngineShown(8);

    expect([engineWasSeen(7), engineWasSeen(8)]).toEqual([true, true]);
  });

  it("says the same thing twice about the same Game, and records it once", () => {
    noteEngineShown(7);
    noteEngineShown(7);

    expect(engineWasSeen(7)).toBe(true);
    expect(JSON.parse(localStorage.getItem("chess-analyst.engine-seen")!)).toEqual([7]);
  });

  it("falls back to 'not seen' rather than trusting a store it cannot read", () => {
    localStorage.setItem("chess-analyst.engine-seen", "{ not json");

    // Best-effort, and this is what that costs: an unreadable store answers no.
    // The app labels a reading, it never claims to have prevented anyone looking.
    expect(engineWasSeen(7)).toBe(false);
  });

  it("survives being handed a stored value of the wrong shape", () => {
    localStorage.setItem("chess-analyst.engine-seen", '{"7":true}');

    expect(engineWasSeen(7)).toBe(false);
  });
});

describe("what actually counts as showing the engine", () => {
  it("counts a level above Unaided on a Game that has been analysed", () => {
    expect(showsEngine({ analyzed: true, mode: "annotated" })).toBe(true);
    expect(showsEngine({ analyzed: true, mode: "detailed" })).toBe(true);
  });

  it("does not count Unaided, whatever the Game", () => {
    // Nothing of the engine is on screen at Unaided, so nothing was shown.
    expect(showsEngine({ analyzed: true, mode: "unaided" })).toBe(false);
  });

  it("does not count a Game with no analysis to show, whatever the level", () => {
    // The level is a willingness to be shown; an unanalysed Game has nothing to
    // show. Marking it "seen" would label an honest blind reading as informed.
    expect(showsEngine({ analyzed: false, mode: "detailed" })).toBe(false);
    expect(showsEngine({ analyzed: false, mode: "annotated" })).toBe(false);
  });
});
