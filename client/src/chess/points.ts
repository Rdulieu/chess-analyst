/**
 * Winning-chances figures, printed the one way this app prints them.
 *
 * **One decimal, always** — enough to add up on screen, not so much as to claim
 * a precision the heuristics do not have, and the same precision everywhere so
 * that three figures on one line read as one measurement rather than as three.
 *
 * It lives here rather than in either panel because the recap and the
 * Phase breakdown invite the Player to add **one** figure to the **other**: two
 * private copies of this would be free to print the same number two ways the
 * day one of them is retuned.
 */

/** One decimal, as a number — so parts can be added *before* being printed,
 *  which is what lets a column of figures land on the total above it. */
export const roundToTenth = (value: number) => Math.round(value * 10) / 10;

/** A chances figure as the Player reads it. */
export const points = (value: number) => `${value.toFixed(1)} %`;
