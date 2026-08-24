/**
 * The `Declared severity` (CONTEXT.md): the Player's own verdict on a Move,
 * inside their `Personal analysis` — the three measured severities plus the two
 * the engine has no band for. The **shared vocabulary is deliberate**: setting a
 * declared verdict beside a measured one is only meaningful on identical labels.
 */
export type DeclaredSeverity = "blunder" | "mistake" | "inaccuracy" | "sound" | "good";

/** The five values, worst to best — the order they are always offered in. */
export const DECLARED_SEVERITIES: DeclaredSeverity[] = [
  "blunder",
  "mistake",
  "inaccuracy",
  "sound",
  "good",
];

/**
 * One mark of a `Personal analysis`. Every judgement is nullable because
 * **silence is not a value**: `null` means *not examined*, and nothing ever
 * stands in for that.
 */
export interface PersonalMark {
  /** 0 is the starting Position, k the Position after the k-th half-move. */
  ply: number;
  declaredSeverity: DeclaredSeverity | null;
  note: string | null;
  keyMoment: boolean;
  /** Written after the seal: kept, shown as such, out of the confrontation. */
  posterior: boolean;
}

/** The Player's reading of one Game, as the API answers it. */
export interface PersonalAnalysis {
  gameId: number;
  sealedAt: string | null;
  engineSeenBeforeSeal: boolean | null;
  marks: PersonalMark[];
}
