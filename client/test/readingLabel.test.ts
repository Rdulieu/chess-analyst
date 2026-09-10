import { describe, it, expect } from "vitest";
import { readingLabel } from "../src/features/confrontation/readingLabel";
import type { MoveReading } from "../src/types";

/**
 * The table of reading labels (US-26, ADR-0033) — **the fifteen cases, one by
 * one**.
 *
 * Tested here rather than through the page for the reason the spec gives:
 * putting them through a render would cost fifteen mounts to check a string.
 * Prior art: `bias.test.ts`, `severity.test.ts`.
 *
 * What these tests describe is **what the Player reads**, never how it is
 * computed — the label, and whether the colour is doing any work the words are
 * not.
 */
function move(over: Partial<MoveReading>): MoveReading {
  return {
    ply: 7,
    notation: "Nf3",
    declared: null,
    measured: "none",
    term: null,
    unscored: null,
    ...over,
  };
}

describe("the reading label of one Move", () => {
  describe("agreements", () => {
    it("names an agreement on a flagged Move", () => {
      const label = readingLabel(
        move({ declared: "mistake", measured: "mistake", term: "bonne-lecture" }),
      );

      expect(label.label).toBe("Bonne lecture");
      expect(label.tone).toBe("agreement");
    });

    it("names an agreement on «nothing flagged», and says the silence was the point", () => {
      const label = readingLabel(
        move({ declared: "sound", measured: "none", term: "bonne-lecture" }),
      );

      expect(label.label).toBe("Bonne lecture");
      // Without this the Player cannot tell what they were right ABOUT, and
      // `Sound` stops being a verdict worth posing.
      expect(label.detail).toMatch(/ne signale rien non plus/i);
    });
  });

  describe("under-read — the danger was bigger than the Player said", () => {
    it("names the severity MISSED when nothing was said", () => {
      const label = readingLabel(move({ declared: null, measured: "blunder", term: "sous-lecture" }));

      expect(label.label).toBe("Bévue ratée");
      expect(label.tone).toBe("missed");
    });

    it("names it missed when the Player had said Sound — they saw nothing", () => {
      const label = readingLabel(
        move({ declared: "sound", measured: "mistake", term: "sous-lecture" }),
      );

      expect(label.label).toBe("Erreur ratée");
    });

    it("says UNDERESTIMATED, not missed, when a milder band was declared", () => {
      const label = readingLabel(
        move({ declared: "mistake", measured: "blunder", term: "sous-lecture" }),
      );

      // The distinction the story exists for: the screen must not tell a Player
      // they were blind when they were merely imprecise.
      expect(label.label).toBe("Bévue sous-estimée");
      expect(label.label).not.toMatch(/ratée/);
    });

    it("names an Inaccuracy missed, not merely «a fault»", () => {
      const label = readingLabel(
        move({ declared: "sound", measured: "inaccuracy", term: "sous-lecture" }),
      );

      expect(label.label).toBe("Imprécision ratée");
    });
  });

  describe("over-read — the Player saw more danger than there was", () => {
    it("calls a band declared on an unflagged Move a false alarm, not «Coup OK»", () => {
      const label = readingLabel(
        move({ declared: "blunder", measured: "none", term: "sur-lecture" }),
      );

      // « Fausse alerte » speaks of the READING; « Coup OK » would speak of the
      // Move's quality, which is not what is being judged here.
      expect(label.label).toBe("Fausse alerte");
      expect(label.tone).toBe("overcalled");
    });

    it("says OVERESTIMATED when a harder band was declared — dramatised, not hallucinated", () => {
      const label = readingLabel(
        move({ declared: "blunder", measured: "mistake", term: "sur-lecture" }),
      );

      expect(label.label).toBe("Bévue surestimée");
      expect(label.detail).toMatch(/dramatisé/i);
    });

    it("names the declared band in the label, not a generic «surestimée»", () => {
      const label = readingLabel(
        move({ declared: "mistake", measured: "inaccuracy", term: "sur-lecture" }),
      );

      expect(label.label).toBe("Erreur surestimée");
    });
  });

  describe("what nothing scores — five cases, five labels, never one grey «NA»", () => {
    it("names a forced Move, and blames the Player for nothing", () => {
      const label = readingLabel(
        move({ declared: "sound", measured: "blunder", unscored: "forced" }),
      );

      expect(label.label).toBe("Coup forcé — non compté");
      // The case that settles the denominator: a Player calling a forced
      // catastrophe `Sound` is RIGHT, and nothing here may suggest otherwise.
      expect(label.detail).toMatch(/ni crédit ni reproche/i);
      expect(label.detail).not.toMatch(/tort|faux|erreur de lecture/i);
    });

    it("names an already-decided Position", () => {
      expect(readingLabel(move({ declared: "blunder", unscored: "decided" })).label).toBe(
        "Position déjà décidée — non comptée",
      );
    });

    it("names an opponent's Move", () => {
      expect(readingLabel(move({ declared: "mistake", unscored: "opponent" })).label).toBe(
        "Coup de l'adversaire",
      );
    });

    it("says a Good has nothing to be compared against, rather than going quiet", () => {
      const label = readingLabel(move({ declared: "good", unscored: "good" }));

      expect(label.label).toBe("Correct — rien à comparer");
      // Said, so the Player does not read the absence of a score as a bug.
      expect(label.detail).toMatch(/aucune bande pour le mérite/i);
    });

    it("distinguishes silence from a verdict", () => {
      const label = readingLabel(move({ declared: null, unscored: "silence" }));

      expect(label.label).toBe("Rien dit");
      expect(label.detail).toMatch(/n'a pas été examiné/i);
    });

    it("gives all five the same tone, and tells them apart by their words alone", () => {
      const cases = ["forced", "decided", "opponent", "good", "silence"] as const;
      const labels = cases.map((unscored) => readingLabel(move({ unscored })));

      // One colour for the five (ADR-0033) — so the label is what separates
      // them, and a Player who cannot see colour loses nothing (ADR-0013).
      expect(new Set(labels.map((l) => l.tone))).toEqual(new Set(["unscored"]));
      expect(new Set(labels.map((l) => l.label)).size).toBe(5);
    });
  });

  it("never leaves a Move without a label", () => {
    // `term` and `unscored` are exclusive and exhaustive on the server, so
    // every entry the screen receives resolves to something sayable.
    const everything: MoveReading[] = [
      move({ declared: "sound", measured: "none", term: "bonne-lecture" }),
      move({ declared: null, measured: "blunder", term: "sous-lecture" }),
      move({ declared: "blunder", measured: "none", term: "sur-lecture" }),
      ...(["forced", "decided", "opponent", "good", "silence"] as const).map((unscored) =>
        move({ unscored }),
      ),
    ];

    for (const entry of everything) {
      expect(readingLabel(entry).label.length).toBeGreaterThan(0);
      expect(readingLabel(entry).detail.length).toBeGreaterThan(0);
    }
  });
});
