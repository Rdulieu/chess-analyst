/*
 * Assertion 7 of `theme-pass.md`, behind one call (US-22, ADR-0021).
 *
 * **What the Player acts on never moves.** Walking the plies of a reading must
 * displace the step controls and the verdict fieldset by zero pixels. That was
 * false on every one of the 45 transitions measured on 2026-08-27, and it was
 * false because the rule had been stated (US-14) and guarded by nobody.
 *
 * It drives; it does not judge. It walks the plies, reads where the two targets
 * sit on the **screen**, and hands back the displacements. Whether zero was
 * achieved is the scenario's sentence to pass, not this file's — the same
 * division as the theme pass, and for the same reason: a library that judged
 * would have to be edited every time a threshold moved.
 *
 * The one thing it refuses is a plausible reading of a walk that did not happen:
 * a target absent at a ply is reported **absent**, never folded into a zero. The
 * verdict fieldset does not exist at the starting Position, and an absence
 * counted as "did not move" would make ply 0 the most stable transition there is.
 */

import { driverCall, guarded, waitForScreen } from "./navigate.mjs";

/**
 * The two things assertion 7 watches. They are the two controls the Player's hand
 * is on Move after Move — the stepper it clicks forty times, and the fieldset it
 * aims five radios in. `theme-pass.md` names them in the assertion itself; this is
 * the machine-readable half of that sentence.
 */
export const STABILITY_TARGETS = ['[data-part="stepper"]', '[data-part="declared-severity"]'];

/**
 * Where each target sits **on the screen**, right now.
 *
 * Viewport coordinates and not document coordinates: the page may scroll between
 * two plies, and what the finger already reaching for `Next` cares about is where
 * `Next` is on the screen. A target that is not on the page reads `null`.
 */
export function stabilityProbeScript({ port, selectors = STABILITY_TARGETS }) {
  return guarded(
    port,
    `const wanted = ${JSON.stringify(selectors)};
     const rects = {};
     for (const selector of wanted) {
       const el = document.querySelector(selector);
       if (!el) { rects[selector] = null; continue; }
       const r = el.getBoundingClientRect();
       rects[selector] = { top: r.top, left: r.left };
     }
     return JSON.stringify(rects);`,
  );
}

/**
 * The readings of a walk, folded into one entry per **transition** per target.
 *
 * Consecutive plies only: a walk is a sequence of transitions, and what the
 * assertion is about is what happens when the Player clicks once.
 */
export function displacementsFrom(readings) {
  const out = [];
  for (let i = 1; i < readings.length; i++) {
    const before = readings[i - 1];
    const after = readings[i];
    for (const selector of Object.keys(after.rects)) {
      const a = before.rects[selector];
      const b = after.rects[selector];
      if (!a || !b) {
        out.push({ from: before.ply, to: after.ply, selector, dTop: null, dLeft: null, absent: true });
        continue;
      }
      out.push({
        from: before.ply,
        to: after.ply,
        selector,
        dTop: b.top - a.top,
        dLeft: b.left - a.left,
      });
    }
  }
  return out;
}

/**
 * The single worst transition of a walk — the figure the assertion turns on.
 *
 * Absences are not candidates: they are not displacements, they are a different
 * fact, and the caller reads them separately.
 */
export function worstDisplacement(displacements) {
  const moved = displacements.filter((d) => !d.absent);
  if (moved.length === 0) return null;
  const size = (d) => Math.max(Math.abs(d.dTop), Math.abs(d.dLeft));
  return moved.reduce((worst, d) => (size(d) > size(worst) ? d : worst), moved[0]);
}

/**
 * Walk `plies` transitions of the reading currently on screen, measuring before
 * and after each one.
 *
 * The click goes through the page's own `Next`, not through a driver-level
 * navigation, and each ply is measured after the screen has settled — a
 * measurement taken while React is still re-rendering is the false finding this
 * suite produces most often.
 */
export async function walkPlyStability(
  session,
  { port, plies = 8, selectors = STABILITY_TARGETS, waitOptions } = {},
) {
  const read = async () => ({
    rects: JSON.parse(await session.evaluate(stabilityProbeScript({ port, selectors }))),
  });

  const caption = async () => JSON.parse(await session.evaluate(driverCall(port, "currentMove()")));

  const readings = [];
  /* Numbered by step rather than by ply: the walk starts wherever the scenario
     left the screen, and what the assertion is about is the transition, not the
     absolute index. The caption travels so a human report can say which Moves
     were crossed. */
  readings.push({ ply: 0, move: await caption(), ...(await read()) });

  for (let i = 1; i <= plies; i++) {
    /* One click per evaluation. A loop of clicks inside a single evaluation
       re-clicks a handler the framework has already replaced — measured
       2026-08-24, where it advanced one ply and reported eight. */
    const stepped = JSON.parse(await session.evaluate(driverCall(port, "step('Next')")));
    if (!stepped) break;
    /* Nothing to match on: the route has not changed. What is waited for is the
       screen settling — the network quiet and the DOM done re-rendering — which is
       exactly what a measurement taken too early gets wrong. */
    await waitForScreen(session, port, () => true, waitOptions);
    readings.push({ ply: i, move: await caption(), ...(await read()) });
  }
  return { readings, displacements: displacementsFrom(readings) };
}
