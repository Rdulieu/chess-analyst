import type { MoveAnnotation } from "../types";
import type { Phase } from "./phase";

/**
 * One `Phase`'s span on the x axis, in plies: `from` is its first ply, and `to`
 * is where the **next** band begins (the last band ends at the last ply).
 *
 * Contiguous on purpose — the ribbon is a ribbon, not a row of ticks: a band
 * ending one ply short of its successor would draw a gap at every boundary, and
 * a gap in a ribbon reads as a Phase nobody named.
 */
export interface PhaseBand {
  phase: Phase;
  from: number;
  to: number;
}

/**
 * The Game's `Phase`s as spans on the shared x axis: what the labelled ribbon
 * between the two drawings names in words, and where the boundary rules fall on
 * both of them.
 *
 * Spans rather than boundaries alone, because the ribbon has to *name* each
 * Phase and not merely mark where one ends — a rule with no label says a
 * boundary happened and not which one. The boundaries fall out of it: every band
 * after the first begins at one.
 */
export function phaseBands(annotations: MoveAnnotation[]): PhaseBand[] {
  const bands: PhaseBand[] = [];

  annotations.forEach((annotation, x) => {
    const current = bands[bands.length - 1];
    if (current && current.phase === annotation.phase) {
      current.to = x;
      return;
    }
    // The band that ends is stretched to where this one starts, so the two meet.
    if (current) current.to = x;
    bands.push({ phase: annotation.phase, from: x, to: x });
  });

  return bands;
}
