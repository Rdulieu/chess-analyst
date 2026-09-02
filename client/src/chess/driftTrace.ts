import type { MoveAnnotation } from "../types";

/** One plotted point: the ply, and everything the Player had lost by then. */
export interface DriftPoint {
  x: number;
  lost: number;
}

/** The cumulative trace, ready to draw, plus the total it ends on. */
export interface DriftTrace {
  points: DriftPoint[];
  lastX: number;
  total: number;
}

/**
 * The running total of what the Player has lost, ply by ply — the drawing that
 * makes the **`Drift`** visible **as a slope**, which is the figure a Player has
 * to be able to look at before believing an aggregate built on it.
 *
 * **One quantity only**: the cumulative loss. The `Drift` is *read* here rather
 * than drawn — the flagged Moves are the cliffs, the Drift is the slope between
 * them. And because the figures come from the annotations themselves (each Move
 * carries what it cost, ADR-0017), this trace cannot disagree with the total the
 * recap states beside it: it is the same numbers, added up.
 *
 * Monotone by construction — a cumulative total of losses only climbs — so there
 * is no case where the picture would suggest the Player got chances *back*, which
 * is a different quantity and belongs to the `Evaluation curve` above it.
 */
export function driftTrace(annotations: MoveAnnotation[]): DriftTrace {
  let running = 0;
  const points = annotations.map((annotation, x) => {
    running += annotation.chancesLost ?? 0;
    return { x, lost: running };
  });

  return { points, lastX: Math.max(0, points.length - 1), total: running };
}

/**
 * The gradations a scale may use, coarsening until at most four intervals fit —
 * a taller box gets a coarser step, never more labels than a 6rem box can print.
 * Every one of them is a multiple or a divisor of 100, so a gradation is always a
 * round share of a whole Game.
 */
const STEPS = [50, 100, 250, 500, 1000, 2500, 5000];

/** The vertical scale the trace is drawn against. */
export interface DriftScale {
  /** The value at the top of the box, never under a whole Game's worth. */
  ceiling: number;
  /** Where 100 % falls, in percent DOWN from the top — the drawing's convention. */
  hundred: number;
  /** The graduations to print, bottom-most first, each at its own height. */
  ticks: DriftTick[];
}

/** One graduation of the scale: the figure, and where to print it. */
export interface DriftTick {
  value: number;
  /** Percent DOWN from the top, the same convention as `hundred`. */
  y: number;
}

/**
 * The scale the cumulative trace is drawn against, in **percent of a whole
 * Game's chances** — the unit the recap already states beside it.
 */
export function driftScale(total: number): DriftScale {
  const ceiling = Math.max(total, 100);
  const y = (value: number) => 100 - (value / ceiling) * 100;
  const step = STEPS.find((candidate) => ceiling / candidate <= 4) ?? ceiling;

  const ticks: DriftTick[] = [];
  for (let value = 0; value <= ceiling; value += step) {
    // 100 is skipped: it is the rule, which carries its own label, and printing
    // it twice at the same height would read as two different figures.
    if (value !== 100) ticks.push({ value, y: y(value) });
  }

  return { ceiling, hundred: y(100), ticks };
}
