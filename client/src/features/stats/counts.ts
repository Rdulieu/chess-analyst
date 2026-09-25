/**
 * The counts `/stats` prints, worded once.
 *
 * Four blocks on this page say "N parties" and "N %", and each had its own copy
 * of the two — which is how one of them came to print « 2 parties n'a pas pu
 * être relue ». Agreement is not decoration in French: it is the difference
 * between a sentence and a typo, and it belongs beside the number rather than
 * being re-derived per block.
 */

/** A count of Games, agreed. */
export const games = (n: number) => `${n} ${n > 1 ? "parties" : "partie"}`;

/** A rate the Player reads, as a whole percent. */
export const percent = (rate: number) => `${Math.round(rate * 100)} %`;

/** The plural mark a word takes for this count — for the words above's company. */
export const plural = (n: number) => (n > 1 ? "s" : "");

/**
 * A signed number the Player reads as a disagreement: `+3`, `0`, `−9`.
 *
 * Zero is written **`0`** and never `+0` nor a dash: material equality is a
 * value the table measured, not a figure it is missing (US-32, and the same
 * refusal of the false zero as everywhere on this page). The minus is the
 * typographic one, so `−9` lines up with `+9` in a column of figures.
 */
export const signed = (n: number) => (n === 0 ? "0" : n > 0 ? `+${n}` : `−${Math.abs(n)}`);
