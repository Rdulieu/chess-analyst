import { describe, it, expect } from "vitest";

import {
  STABILITY_TARGETS,
  displacementsFrom,
  stabilityProbeScript,
  worstDisplacement,
} from "./stability.mjs";

/*
 * Assertion 7 of `theme-pass.md`: walking the plies of a reading must displace
 * the step controls and the verdict fieldset by **zero pixels**.
 *
 * The pixels only exist in a browser. What is testable here is everything that
 * decides what the pixels MEAN — which selectors are watched, what the injected
 * script asks for, and how a list of readings folds into displacements. That fold
 * is the part a scenario would otherwise re-derive, and re-deriving it is how the
 * same walk produced two different verdicts on this suite before.
 */

describe("what assertion 7 watches", () => {
  it("watches the two things the Player acts on, and names them as the document does", () => {
    expect(STABILITY_TARGETS).toEqual(['[data-part="stepper"]', '[data-part="declared-severity"]']);
  });
});

describe("the probe evaluated on the page", () => {
  const script = stabilityProbeScript({ port: "5199", selectors: STABILITY_TARGETS });

  it("is port-guarded like every other injected script", () => {
    expect(script).toContain("location.port");
    expect(script).toContain("5199");
  });

  it("returns its value, because `guarded` wraps it in an IIFE", () => {
    // A body without `return` evaluates to undefined and the caller's JSON.parse
    // then fails on the string "undefined" — an error that names nothing.
    expect(script).toMatch(/return/);
  });

  it("asks for viewport position, not for document position", () => {
    // The page can scroll between two plies; what the Player's finger cares about
    // is where the button is on the SCREEN.
    expect(script).toContain("getBoundingClientRect");
  });
});

describe("folding readings into displacements", () => {
  const at = (ply, tops) => ({
    ply,
    rects: Object.fromEntries(
      Object.entries(tops).map(([sel, top]) => [sel, top === null ? null : { top, left: 10 }]),
    ),
  });

  it("reports zero when nothing moved between two plies", () => {
    const moved = displacementsFrom([at(1, { stepper: 100 }), at(2, { stepper: 100 })]);
    expect(moved).toEqual([{ from: 1, to: 2, selector: "stepper", dTop: 0, dLeft: 0 }]);
  });

  it("reports the displacement, signed, so the direction is readable", () => {
    const moved = displacementsFrom([at(1, { stepper: 100 }), at(2, { stepper: 128 })]);
    expect(moved[0].dTop).toBe(28);
  });

  it("says a target was ABSENT rather than pretending it did not move", () => {
    // The verdict fieldset does not exist at ply 0. Folding an absence into a zero
    // would report the starting Position as the most stable transition there is.
    const moved = displacementsFrom([
      at(0, { "declared-severity": null }),
      at(1, { "declared-severity": 300 }),
    ]);
    expect(moved[0]).toMatchObject({ selector: "declared-severity", absent: true });
    expect(moved[0].dTop).toBe(null);
  });

  it("compares consecutive plies only — a walk is transitions, not a scatter", () => {
    const moved = displacementsFrom([at(1, { s: 100 }), at(2, { s: 100 }), at(3, { s: 140 })]);
    expect(moved.map((m) => [m.from, m.to])).toEqual([
      [1, 2],
      [2, 3],
    ]);
  });

  it("gives the worst displacement of a walk, which is the figure the assertion turns on", () => {
    const moved = displacementsFrom([at(1, { s: 100 }), at(2, { s: 128 }), at(3, { s: 82 })]);
    expect(worstDisplacement(moved)).toMatchObject({ dTop: -46, from: 2, to: 3 });
  });

  it("calls a walk that never moved anything zero, not merely small", () => {
    const moved = displacementsFrom([at(1, { s: 100 }), at(2, { s: 100 })]);
    expect(worstDisplacement(moved)).toMatchObject({ dTop: 0 });
  });
});
