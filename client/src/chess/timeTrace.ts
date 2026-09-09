import type { PlyTime } from "../types";

/** One Move's bar in the « Temps par coup » drawing. */
export interface TimeBar {
  ply: number;
  spentCs: number;
  /** Whether this Move is the Player's — what decides which way the bar goes. */
  mine: boolean;
  /** The bar's height, as a percentage of the shared ceiling. */
  height: number;
}

/** One printed graduation of the scale. */
export interface TimeTick {
  /** The value, in words, seconds included — never a bare number. */
  label: string;
  /** Where it sits, as a percentage from the axis. */
  y: number;
}

export interface TimeTrace {
  bars: TimeBar[];
  /** The last ply, so the x axis is the Game's own — shared with the other two
   *  drawings, which is what lets them be compared by looking down. */
  lastX: number;
  /** The ceiling both halves are drawn against; `0` when nothing is drawn. */
  ceilingCs: number;
  ticks: TimeTick[];
}

/**
 * A ceiling a person would have chosen: 1, 2 or 5 times a power of ten, in
 * seconds, at or above the longest Move.
 *
 * The drawing is scaled to the **Game**, not to a fixed budget, because a
 * cadence's budget says nothing about how long its longest think was — on a
 * 5-minute Game where nothing took more than 4 s, a box worth 300 s would draw
 * forty invisible bars. The cost is that two Games are not comparable by height,
 * which is why the scale is **printed** and why the panel beside it says the
 * reading belongs to one cadence.
 *
 * Never zero: everything downstream divides by it.
 */
export function niceCeilingCs(longestCs: number): number {
  // A second is the floor. Below it every bar is noise, and a sub-second ceiling
  // would make a 0.3 s reflex fill the box.
  if (longestCs <= 100) return 100;
  const seconds = longestCs / 100;
  const magnitude = 10 ** Math.floor(Math.log10(seconds));
  for (const step of [1, 2, 5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= seconds) return Math.round(candidate * 100);
  }
  return Math.round(10 * magnitude * 100);
}

/**
 * The geometry of the « Temps par coup » drawing (US-15b).
 *
 * **The Player's Moves go up, the opponent's go down**, from one shared axis.
 * The side is carried by **position**, so the picture never depends on a colour
 * to say whose Move a bar is (ADR-0013) — and the two halves face each other,
 * which is what makes "he was moving fast, I was not" a thing you see rather
 * than a thing you compute.
 *
 * **One ceiling for both halves.** A ceiling per side would draw the opponent's
 * 2 s Move at the same height as the Player's 40 s one, and the comparison is
 * the only reason the opponent is on the picture at all.
 *
 * A Move with **no figure is not drawn**. A bar of height zero reads as "played
 * instantly", which is a measurement; an underivable time is not one, and a
 * fabricated zero is what a later aggregate would average (SPEC US-18).
 */
export function timeTrace(plies: PlyTime[], playerColor: "white" | "black"): TimeTrace {
  const measured = plies.filter(
    (ply): ply is PlyTime & { spentCs: number } => ply.ply > 0 && ply.spentCs !== null,
  );
  const lastX = Math.max(...plies.map((ply) => ply.ply), 0);
  if (measured.length === 0) return { bars: [], lastX, ceilingCs: 0, ticks: [] };

  const ceilingCs = niceCeilingCs(Math.max(...measured.map((ply) => ply.spentCs)));
  const bars = measured.map((ply) => ({
    ply: ply.ply,
    spentCs: ply.spentCs,
    // Ply 1 is White's first Move, so odd plies are White's.
    mine: (ply.ply % 2 === 1) === (playerColor === "white"),
    height: (ply.spentCs / ceilingCs) * 100,
  }));

  return { bars, lastX, ceilingCs, ticks: scaleOf(ceilingCs) };
}

/**
 * The printed graduations: the ceiling and its half.
 *
 * They are what licenses an `aria-hidden` drawing — the precedent `DriftGraph`
 * sets is that a picture may be hidden from the reader only while every figure
 * in it exists in text. Here the scale gives the magnitude and the current-Move
 * line beside the drawing gives the exact pair, Move by Move.
 */
function scaleOf(ceilingCs: number): TimeTick[] {
  const say = (cs: number) => {
    const seconds = cs / 100;
    return seconds >= 60 ? `${Math.round(seconds / 60)} min` : `${Math.round(seconds)} s`;
  };
  return [
    { label: say(ceilingCs), y: 100 },
    { label: say(ceilingCs / 2), y: 50 },
  ];
}
