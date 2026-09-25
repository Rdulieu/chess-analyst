import { materialDelta } from "../analysis/material-delta";
import { bucket, type Bucket } from "../results/win-rate";
import type { EndgameCrossing } from "./signatures";

/**
 * One band of material disagreement: how it is written, and what it holds.
 *
 * The cuts are **a choice, assumed on the screen rather than hidden**: a pawn's
 * width around equality (`−2..+2`, which is where `RR vs Q` lands), then one
 * minor piece, then a rook, then a queen. Nothing measured picks them; what is
 * measured is what they show, and the table prints its own bands so the reader
 * can disagree with them.
 */
export interface MaterialBand {
  label: string;
  /** Inclusive bounds; `null` is an open end. */
  from: number | null;
  to: number | null;
}

/** The seven bands, poorest first, and the order of the rows. */
export const MATERIAL_BANDS: MaterialBand[] = [
  { label: "≤ −9", from: null, to: -9 },
  { label: "−8..−6", from: -8, to: -6 },
  { label: "−5..−3", from: -5, to: -3 },
  { label: "−2..+2", from: -2, to: 2 },
  { label: "+3..+5", from: 3, to: 5 },
  { label: "+6..+8", from: 6, to: 8 },
  { label: "≥ +9", from: 9, to: null },
];

/**
 * **What the band does not say.** The widest and the narrowest win rate among
 * the configurations that sit inside it — and how many of them were looked at.
 *
 * It is the mitigation of the whole table, and it is measured rather than
 * asserted: on the requester's base the equal band spreads from 0 % to 83 %.
 * The band situates; it does not predict. Without this, a monotone column of
 * seven rates reads as a law.
 *
 * `null` when no configuration in the band clears the table's threshold — a
 * spread of one Game against another is noise, and printing it would mitigate
 * nothing.
 */
export interface MaterialSpread {
  configurations: number;
  lowest: number;
  highest: number;
}

/** One band's line: its couples, its results, and what it hides. */
export interface MaterialBandRow extends Bucket {
  band: string;
  spread: MaterialSpread | null;
}

/**
 * **The material disagreement set against the win rate** (US-32, requested
 * 2026-09-25), and the reading that makes the column beside the configurations
 * usable.
 *
 * Three things it is built not to be:
 *
 * - **Not a re-ordering.** The configuration table keeps its own order — most
 *   played first — and its own key, the signature. This is a second table with
 *   its own axis, never a regrouping of the first one's rows: two
 *   configurations at the same delta stay two lines up there, because they are
 *   two different games of chess.
 * - **Not a count of Games.** Its unit is the couple **(Game, configuration)**:
 *   a Game crosses several configurations and therefore lands in several bands.
 *   The column does not add up to a history, and the screen says so.
 * - **Not a prediction.** Every row carries its `spread`, so the reader meets
 *   the band's rate and the range it covers at the same time.
 */
export interface MaterialBandTable {
  rows: MaterialBandRow[];
  /** Every couple filed — the unit, announced rather than inferred. */
  couples: number;
  /** The bar a configuration clears to enter a `spread`: the table's own. */
  threshold: number;
  /**
   * Which band holds material **equality** — the one the mitigation sentence is
   * written about, named here rather than matched on a label by the page.
   *
   * The fold itself privileges no band: every row carries its own `spread`,
   * because which band spreads widest is a fact about the Player's Games and
   * not a property of the cuts. The screen then has a band to point at.
   */
  equalBand: string;
}

function bandOf(delta: number): MaterialBand {
  const band = MATERIAL_BANDS.find(
    (b) => (b.from === null || delta >= b.from) && (b.to === null || delta <= b.to),
  );
  // Unreachable while the bands cover the integers with both ends open — which
  // is the invariant, asserted here rather than papered over with a default
  // band that would file a delta under a reading it does not belong to.
  if (!band) throw new Error(`no material band holds ${delta}`);
  return band;
}

/**
 * Folds the very crossings the configuration table folds — no second replay, so
 * `/stats` pays nothing for this (ADR-0015: no column, no migration, no engine
 * time).
 */
export function materialBandTable(
  crossings: EndgameCrossing[],
  threshold: number,
): MaterialBandTable {
  const byBand = new Map<string, EndgameCrossing[]>();
  const bySignature = new Map<string, { band: string; played: EndgameCrossing[] }>();
  let couples = 0;

  for (const crossing of crossings) {
    for (const key of crossing.signatures) {
      const band = bandOf(materialDelta(key)).label;
      couples += 1;

      const inBand = byBand.get(band);
      if (inBand) inBand.push(crossing);
      else byBand.set(band, [crossing]);

      const held = bySignature.get(key);
      if (held) held.played.push(crossing);
      else bySignature.set(key, { band, played: [crossing] });
    }
  }

  return {
    rows: MATERIAL_BANDS.map(({ label }) => ({
      band: label,
      ...bucket(byBand.get(label) ?? []),
      spread: spreadOf([...bySignature.values()].filter((s) => s.band === label), threshold),
    })),
    couples,
    threshold,
    equalBand: bandOf(0).label,
  };
}

/** The range of the band's own configurations, over those worth a rate. */
function spreadOf(
  inBand: { played: EndgameCrossing[] }[],
  threshold: number,
): MaterialSpread | null {
  const rates = inBand
    .filter((s) => s.played.length >= threshold)
    .map((s) => bucket(s.played).winRate)
    // Never null past the filter — `winRate` is null on an empty bucket alone,
    // and the threshold is at least one Game. Narrowed rather than asserted.
    .filter((rate): rate is number => rate !== null);
  if (rates.length === 0) return null;

  return {
    configurations: rates.length,
    lowest: Math.min(...rates),
    highest: Math.max(...rates),
  };
}
