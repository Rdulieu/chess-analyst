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
