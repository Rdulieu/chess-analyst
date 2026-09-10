import { DECLARED_SEVERITY_LABEL } from "../personal/declaredSeverity";
import type { MoveReading } from "../../types";

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
  /** The sentence under the cartouche, when the label alone does not suffice. */
  detail: string;
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
    detail:
      "Il n'y avait pas d'autre coup légal : jouer le seul coup possible ne vaut ni crédit ni reproche, quoi que le moteur mesure ici.",
  },
  decided: {
    tone: "unscored",
    label: "Position déjà décidée — non comptée",
    detail:
      "Il ne restait plus assez à perdre pour qu'un coup dise quelque chose de votre jeu.",
  },
  opponent: {
    tone: "unscored",
    label: "Coup de l'adversaire",
    detail:
      "Gardé et montré, jamais noté — non faute de moyens, mais parce que cet outil porte sur votre propre progrès.",
  },
  good: {
    tone: "unscored",
    label: "Correct — rien à comparer",
    detail:
      "Le moteur ne flague que les coups fautifs et n'a aucune bande pour le mérite : il n'y a rien à opposer à ce verdict. Il compte dans ce que vous avez examiné, pas dans ce que vous avez vu juste.",
  },
  silence: {
    tone: "unscored",
    label: "Rien dit",
    detail:
      "Vous n'avez pas posé de verdict ici. Ce n'est ni juste ni faux : ce coup n'a pas été examiné.",
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
  if (move.unscored) return UNSCORED[move.unscored];

  if (move.term === "bonne-lecture") {
    return {
      tone: "agreement",
      label: "Bonne lecture",
      detail: agreementDetail(move),
    };
  }

  // The severity **at stake** is the worse of the two: what was missed when the
  // Player under-read, what was claimed when they over-read.
  if (move.term === "sous-lecture") {
    const missed = MEASURED_NAME[move.measured];
    // Nothing said, or `Sound`: the Player did not see it at all. A degree
    // apart: they saw it, and smaller than it was. Melting the two would tell
    // someone they were blind when they were only imprecise.
    const blind = move.declared === null || move.declared === "sound";
    return {
      tone: "missed",
      label: blind ? `${missed} ratée` : `${missed} sous-estimée`,
      detail: blind
        ? `Le moteur mesure ${article(missed)} ici, et vous ne l'aviez pas signalée.`
        : `Vous aviez dit « ${DECLARED_SEVERITY_LABEL[move.declared!]} » ; le moteur mesure ${article(missed)}. Vous avez vu le danger, plus petit qu'il n'était.`,
    };
  }

  // Over-read. Either the engine flagged nothing at all — a false alarm — or it
  // flagged something milder than the Player claimed.
  const claimed = DECLARED_SEVERITY_LABEL[move.declared!];
  if (move.measured === "none") {
    return {
      tone: "overcalled",
      label: "Fausse alerte",
      detail: `Vous aviez dit « ${claimed} » ; le moteur ne signale rien sur ce coup. Sur-lire le danger est un défaut d'analyse comme un autre — et l'inverse du précédent.`,
    };
  }
  return {
    tone: "overcalled",
    label: `${claimed} surestimée`,
    detail: `Vous aviez dit « ${claimed} » ; le moteur mesure ${article(MEASURED_NAME[move.measured])}. Vous avez dramatisé, pas halluciné.`,
  };
}

/**
 * Why an agreement is an agreement. Worth a sentence of its own on the fourth
 * column: a Player who posed `Sound` and reads "Bonne lecture" should see that
 * the engine's **silence** is what they were right about — that is the entire
 * reason `Sound` is a value one poses.
 */
function agreementDetail(move: MoveReading): string {
  return move.measured === "none"
    ? "Vous aviez regardé et ne trouviez rien à reprocher ; le moteur ne signale rien non plus."
    : `Vous aviez dit « ${DECLARED_SEVERITY_LABEL[move.declared!]} », et c'est exactement ce que le moteur mesure.`;
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

/** French wants the article agreed; all three names happen to be feminine. */
function article(name: string): string {
  return `une ${name.toLowerCase()}`;
}
