import { DECLARED_SEVERITY_LABEL } from "../personal/declaredSeverity";
import { moveName } from "./moveName";
import { halfMoveGap, points } from "./distance";
import type { MoveKeyMoment, MoveReading } from "../../types";

/**
 * What the cartouche says about the Player's reading of the current Move, and
 * in which register — the table ADR-0033 asks for, **parameterised by the
 * case** so that no legend is needed: the label *is* the explanation.
 *
 * A pure module beside `bias.ts`, which has exactly this shape, and for the
 * reason the spec gives: putting the fifteen cases through the page's render
 * would cost fifteen mounts to check a string.
 *
 * **The tone is never the only cue** (ADR-0013). Every case has a label that
 * reads on its own, and the labels are deliberately unequal in length and
 * wording rather than five variations of one sentence — a Player scanning them
 * should not have to compare adjectives to know which case they are in.
 */

/** The register a case is read in. Not a colour — the sheet decides that. */
export type ReadingTone = "agreement" | "missed" | "overcalled" | "unscored";

/** What the cartouche shows: a name, and the register to show it in. */
export interface ReadingLabel {
  tone: ReadingTone;
  label: string;
  /**
   * An extra **fact** the label cannot hold — and nothing else.
   *
   * These used to carry a sentence of explanation per case, and the requester
   * was right that it was redundant: the label already names the case, and
   * since slice 06 the move list shows both authors in titled columns, so a
   * paragraph restating "you said X, the engine says Y" repeated what was
   * already on screen twice. Worse, it was height — under the diagram it
   * pushed everything below it on every ply.
   *
   * What survives is what the label genuinely cannot say: **the distance** to
   * the loss a marker missed. The explanations belong in a tooltip, which is
   * **US-41**, not in the column.
   */
  detail?: string;
}

/**
 * How each unscored case names itself. **A mute grey "NA" is forbidden**: it
 * would erase the case that settles the whole denominator — a forced Move
 * measured a `Blunder` where the Player said `Sound` and **is right**.
 */
const UNSCORED: Record<NonNullable<MoveReading["unscored"]>, ReadingLabel> = {
  forced: {
    tone: "unscored",
    label: "Coup forcé — non compté",
  },
  decided: {
    tone: "unscored",
    label: "Position déjà décidée — non comptée",
  },
  opponent: {
    tone: "unscored",
    label: "Coup de l'adversaire",
  },
  good: {
    tone: "unscored",
    label: "Correct — rien à comparer",
  },
  silence: {
    tone: "unscored",
    label: "Rien dit",
  },
};

/**
 * The reading of one Move, named.
 *
 * The three scored cases are **not** three fixed strings: the gap cases name
 * **which severity** is concerned, because "Bévue ratée" and "Imprécision
 * ratée" are not the same lesson. And "ratée" is kept apart from
 * "sous-estimée" — the screen must not tell a Player they were blind when they
 * were merely imprecise.
 */
export function readingLabel(move: MoveReading): ReadingLabel {
  if (move.unscored) return unscoredLabel(move, move.unscored);

  if (move.term === "bonne-lecture") {
    return {
      tone: "agreement",
      label: "Bonne lecture",
    };
  }

  // The severity **at stake** is the worse of the two: what was missed when the
  // Player under-read, what was claimed when they over-read.
  if (move.term === "sous-lecture") {
    const missed = MEASURED_NAME[move.measured];
    /*
     * `Sound`, or nothing said at all: the Player did not see it. A milder
     * BAND: they saw it, and judged it smaller than it was. Melting the two
     * would tell someone they were blind when they were merely imprecise —
     * the distinction this whole slice exists for.
     *
     * Written as a narrowing branch rather than a boolean plus a ternary,
     * because the ternary's else-arm has to index a label table and a flag
     * carries no proof to the type system that the key is there.
     *
     * The `null` case cannot arrive from the server — a null verdict is always
     * `unscored: "silence"` — and it is handled rather than asserted away.
     */
    const declared = move.declared;
    /*
     * **`Good` counts as blind, and that is the point of the case.** Nothing
     * said, `Sound`, or `Good` all mean the Player reported no danger — so the
     * severity was *missed*, not under-estimated. Melting `Good` into
     * "sous-estimée" would be gentler and false: someone who calls a `Blunder`
     * a good Move did not see a smaller danger, they saw the opposite of one.
     */
    if (declared === null || declared === "sound" || declared === "good") {
      return {
        tone: "missed",
        label: `${missed} ratée`,
      };
    }
    return {
      tone: "missed",
      label: `${missed} sous-estimée`,
    };
  }

  /*
   * Over-read — and **guarded rather than assumed**. The server holds `term`
   * and `unscored` exclusive and exhaustive, so reaching here means
   * `sur-lecture` and a declared band. But this branch used to be the
   * fall-through for *anything* that was neither of the two cases above, and an
   * entry arriving with both fields null would have printed the words
   * `undefined surestimée` on screen. A screen that invents a severity is worse
   * than one that says nothing, so the impossible case is named and refused.
   */
  if (move.term !== "sur-lecture" || move.declared === null) {
    return {
      tone: "unscored",
      label: "Rien dit",
    };
  }
  const claimed = DECLARED_SEVERITY_LABEL[move.declared];
  if (move.measured === "none") {
    return {
      tone: "overcalled",
      label: "Fausse alerte",
    };
  }
  return {
    tone: "overcalled",
    label: `${claimed} surestimée`,
  };
}

/**
 * An unscored case, **carrying the verdict the Player placed there**.
 *
 * The verdict is what makes this case worth showing at all: *"le coup est
 * montré, sa raison d'exclusion aussi, et le verdict du joueur dessus n'est pas
 * noté"*. A forced catastrophe measures a `Blunder` and is nobody's mistake, so
 * a Player who called it `Sound` is **right** — and the screen can only say so
 * while the verdict is still on it. Dropping it would leave the case that
 * settles the whole denominator invisible, which is the one thing this screen
 * cannot afford: it is the reason the denominator is what it is.
 *
 * Not appended to `good` (the label already names the verdict) nor to `silence`
 * (there is none by definition) — saying "vous aviez dit Bon" under "Correct —
 * rien à comparer" would be the screen repeating itself.
 */
function unscoredLabel(move: MoveReading, unscored: NonNullable<MoveReading["unscored"]>): ReadingLabel {
  const base = UNSCORED[unscored];

  /*
   * A `Good` reaches here only when the engine flagged **nothing** — the one
   * case where "rien à comparer" is true. A `Good` on a measured fault is
   * scored now, as the strongest `Sous-lecture` there is, and never arrives.
   */
  return base;
}

/** The measured bands, in the Player's own words — the shared vocabulary. */
const MEASURED_NAME: Record<MoveReading["measured"], string> = {
  blunder: "Bévue",
  mistake: "Erreur",
  inaccuracy: "Imprécision",
  // Never reached by a label that names a severity: `none` is only ever the
  // false-alarm case, which has its own words.
  none: "rien",
};


/**
 * **The second family of cartouches** — what the Player's `Key moment`s were
 * worth here (ADR-0033).
 *
 * The two families reuse the same four tones deliberately: **the colour says
 * the quality, the glyph says what is being talked about, the label says the
 * case.** Three cues, none of them alone — and the `◆` is the one that keeps
 * "I judged well" from being mistaken for "I looked in the right place", which
 * a colour alone could never distinguish.
 *
 * `◆` is not a new sign: it is the marker the move list already uses for a
 * `Key moment` (`MoveMarks`), so the Player meets one glyph in two places
 * rather than learning a second vocabulary.
 */
export const KEY_MOMENT_GLYPH = "◆";

export function keyMomentLabel(reading: MoveKeyMoment, ply: number): ReadingLabel {
  switch (reading.case) {
    case "found":
      return {
        tone: "agreement",
        label: `${KEY_MOMENT_GLYPH} Moment clé trouvé`,
      };
    case "aside":
      return {
        tone: "overcalled",
        label: `${KEY_MOMENT_GLYPH} Marqueur à côté`,
        // The distance, NAMED — "your marker is on 21.Rd1, which cost nothing;
        // the loss is on 22.Nxe5" teaches where to have looked, where a silent
        // partial credit would teach nothing and hide the miss.
        /*
         * The Move **and the distance** — the ticket asks for both, and the
         * distance is the half that teaches: a marker one half-move from the
         * loss and one six away are not the same near miss.
         *
         * **« La perte LA PLUS PROCHE »**, and the adjective is load-bearing.
         * The HP suite read « 0 % des dégâts trouvés — 0 points sur 109 »
         * and, directly beneath, « la perte est sur 14…e5 (16 points) » — the
         * definite article naming *the* loss of a Game whose 109 points are
         * spread over five faulty Moves, the largest of them elsewhere. The
         * sentence was always about the NEAREST fault, which is the useful
         * thing to say to a misplaced marker; it simply did not say so, and
         * left the reader to reconcile 109 with 16 by guessing.
         */
        detail: reading.nearest
          ? `Ce coup n'a rien coûté. La perte la plus proche est sur ${moveName(reading.nearest.ply, reading.nearest.notation)} (${points(reading.nearest.lost)}), ${halfMoveGap(ply, reading.nearest.ply)} plus loin.`
          : "Ce coup n'a rien coûté.",
      };
    case "no-target":
      return {
        tone: "unscored",
        label: `${KEY_MOMENT_GLYPH} Marqueur sans cible`,
        // Not a miss: there was nothing to find. Saying "beside the damage"
        // here would invent a mistake the Player did not make.
      };
    case "on-opponent":
      return {
        tone: "unscored",
        label: `${KEY_MOMENT_GLYPH} Marqueur sur l'adversaire`,
      };
    case "on-uncounted":
      return {
        tone: "unscored",
        label: `${KEY_MOMENT_GLYPH} Marqueur sur un coup non compté`,
      };
    case "missed":
      return {
        tone: "missed",
        label: `${KEY_MOMENT_GLYPH} Moment clé manqué`,
        // The 70% that had no Move to show. This is the whole point of the case.
      };
  }
}
