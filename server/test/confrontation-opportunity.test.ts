import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { getGameAnnotations } from "../src/annotations/repository";
import { getPersonalAnalysis } from "../src/personal/repository";
import {
  confrontGame,
  ConfrontationRefusal,
  type GameConfrontation,
  type MoveReading,
} from "../src/personal/confrontation";
import { seedConfrontationFixture, CONFRONTATION_FIXTURE_CASES } from "../src/personal/fixture";
import { gameNotations } from "../src/chess/positions";
import { seedProfile } from "./fixtures";
import { games } from "../src/db/schema";
import { eq } from "drizzle-orm";

/**
 * **The `Confrontation` scores the Player's verdicts on the opponent's Moves**
 * (US-30, ADR-0034).
 *
 * Every assertion here starts from an **input** — the seeded reading and the
 * stored `Evaluation`s — and checks what the derivation *produces*. None of them
 * hands the code the term it then verifies: that is the shape that let eleven
 * blocking findings through US-26, and it is the one thing this suite may not do.
 */
describe("the opponent side of a Confrontation", () => {
  const confronted = (() => {
    let cached: GameConfrontation | null = null;
    return () => {
      if (cached) return cached;
      const { db } = openDb(":memory:");
      const profileId = seedProfile(db, "fixture-reader");
      const gameId = seedConfrontationFixture(db, profileId);
      const annotations = getGameAnnotations(db, gameId)!;
      const analysis = getPersonalAnalysis(db, gameId)!;
      const game = db.select().from(games).where(eq(games.id, gameId)).get()!;
      const result = confrontGame(analysis, annotations, gameNotations(game.pgn));
      if (result instanceof ConfrontationRefusal) throw new Error(`refused: ${result.reason}`);
      return (cached = result);
    };
  })();

  const at = (ply: number): MoveReading => {
    const entry = confronted().moves.find((move) => move.ply === ply);
    if (!entry) throw new Error(`no reading for ply ${ply}`);
    return entry;
  };

  describe("a verdict on a measured opponent ply gets one of the three terms", () => {
    it("calls a verdict on the band a Bonne lecture", () => {
      const { opportunitySeenWellRead } = CONFRONTATION_FIXTURE_CASES;
      const entry = at(opportunitySeenWellRead);

      // The input: a `Blunder`-sized `Opportunity`, declared `blunder`. The
      // term is the derivation's answer, not this test's.
      expect(entry.declared).toBe("blunder");
      expect(entry.opportunity).toBe("blunder");
      expect(entry.opportunityTerm).toBe("bonne-lecture");
    });

    it("calls a milder verdict than the Opportunity a Sous-lecture", () => {
      const { opportunitySeenUnderRead } = CONFRONTATION_FIXTURE_CASES;
      const entry = at(opportunitySeenUnderRead);

      expect(entry.declared).toBe("inaccuracy");
      expect(entry.opportunity).toBe("blunder");
      expect(entry.opportunityTerm).toBe("sous-lecture");
    });

    it("uses the same three terms as the Player's own side, and no fourth", () => {
      const terms = new Set(
        confronted()
          .moves.map((move) => move.opportunityTerm)
          .filter((term) => term !== null),
      );

      expect(terms.size).toBeGreaterThan(0);
      for (const term of terms) {
        expect(["bonne-lecture", "sous-lecture", "sur-lecture"]).toContain(term);
      }
    });
  });

  describe("the opponent term lives in its own fields — the Player's reading is untouched", () => {
    it("never puts the opponent term in `term`", () => {
      // `term` is the Player's reading of themselves. An opponent ply carries
      // no `term` at all, whatever the derivation now says about it.
      for (const move of confronted().moves) {
        if (move.opportunityTerm !== null) {
          expect(move.term, `ply ${move.ply}`).toBeNull();
        }
      }
    });

    it("keeps the grey «coup de l'adversaire» on the very plies it now scores", () => {
      const { opportunitySeenWellRead, opportunitySeenUnderRead } = CONFRONTATION_FIXTURE_CASES;

      // Scored and still not the Player's Move: the two facts are not rivals,
      // and the screen needs both.
      expect(at(opportunitySeenWellRead).unscored).toBe("opponent");
      expect(at(opportunitySeenUnderRead).unscored).toBe("opponent");
    });

    it("**non-regression**: the Player's four counters are what they were", () => {
      const { severity } = confronted();

      // The values the fixture produced **before** this slice, pinned here so
      // that any opponent numerator leaking into the Player's figures goes red
      // at once. The opponent cases the fixture gains all sit on opponent
      // plies, which contribute to none of these four by construction.
      expect(severity.countedMoves).toBe(16);
      expect(severity.examined).toBe(10);
      expect(severity.scorable).toBe(9);
      expect(severity.agreed).toBe(3);
    });
  });

  describe("an opponent ply with nothing measured stays unscored", () => {
    it("leaves a verdict on an opponent ply that offered nothing without a term", () => {
      const { opponentVerdict } = CONFRONTATION_FIXTURE_CASES;
      const entry = at(opponentVerdict);

      expect(entry.declared).not.toBeNull();
      expect(entry.opportunity).toBeNull();
      expect(entry.opportunityTerm).toBeNull();
      expect(entry.unscored).toBe("opponent");
    });

    it("leaves an opponent ply with neither measure nor verdict entirely silent", () => {
      const quiet = confronted().moves.find(
        (move) =>
          move.unscored === "opponent" && move.declared === null && move.opportunity === null,
      );

      expect(quiet).toBeDefined();
      expect(quiet!.opportunityTerm).toBeNull();
      expect(quiet!.term).toBeNull();
    });

    it("offers nothing on a Move played in an already decided Position", () => {
      const { opportunityInDecidedPosition } = CONFRONTATION_FIXTURE_CASES;
      const entry = at(opportunityInDecidedPosition);

      // The drop is there; the Position had nothing left to give, so nothing
      // was on offer. The verdict the Player wrote stays grey.
      expect(entry.declared).not.toBeNull();
      expect(entry.opportunity).toBeNull();
      expect(entry.opportunityTerm).toBeNull();
    });

    it("**counts a forced opponent Move** — the asymmetry that must not be «fixed»", () => {
      const { opportunityForced } = CONFRONTATION_FIXTURE_CASES;
      const entry = at(opportunityForced);

      // `forced` exists so nobody is blamed, and nobody is blamed here: the
      // subject is what the Player was handed.
      expect(entry.opportunity).not.toBeNull();
      expect(entry.opportunityTerm).not.toBeNull();
    });
  });

  describe("the two figures, beside the Player's and never fused with them", () => {
    it("carries a coverage and an accuracy of its own, undivided", () => {
      const { opportunities } = confronted();

      expect(opportunities.offered).toBeGreaterThan(0);
      expect(opportunities.examined).toBeGreaterThan(0);
      // Raw with its denominator: nothing here is a rate.
      for (const value of Object.values(opportunities)) {
        expect(Number.isInteger(value)).toBe(true);
      }
    });

    it("renders the Opportunities never looked at apart", () => {
      const { opportunities } = confronted();

      // A different failure from a badly read one — and on the requester's own
      // base, the larger of the two.
      expect(opportunities.unseen).toBeGreaterThan(0);
    });

    it("is never fused into «Ce que j'ai vu juste» — the two denominators are disjoint", () => {
      const { moves } = confronted();

      // Se juger soi-même et repérer ce qu'on vous offre sont deux aptitudes
      // différentes: not one ply may sit in both denominators.
      const both = moves.filter(
        (move) => move.opportunity !== null && move.unscored !== "opponent",
      );

      expect(both).toHaveLength(0);
    });
  });

  /**
   * **ADR-0032 for the opponent side.** Each figure is re-derived here by
   * folding the per-Move list, and must land exactly on the one served. A test
   * that copied the served number would assert nothing at all.
   */
  describe("the figures ARE the fold of the list", () => {
    const opportunityMoves = () =>
      confronted().moves.filter((move) => move.opportunity !== null);

    it("re-derives `offered`", () => {
      expect(opportunityMoves()).toHaveLength(confronted().opportunities.offered);
    });

    it("re-derives `examined`", () => {
      const examined = opportunityMoves().filter((move) => move.declared !== null);

      expect(examined).toHaveLength(confronted().opportunities.examined);
    });

    it("re-derives `agreed`", () => {
      const agreed = confronted().moves.filter(
        (move) => move.opportunityTerm === "bonne-lecture",
      );

      expect(agreed).toHaveLength(confronted().opportunities.agreed);
    });

    it("re-derives `unseen`", () => {
      const unseen = opportunityMoves().filter((move) => move.declared === null);

      expect(unseen).toHaveLength(confronted().opportunities.unseen);
    });

    it("exhausts the denominator: examined plus unseen IS offered", () => {
      const { offered, examined, unseen } = confronted().opportunities;

      expect(examined + unseen).toBe(offered);
    });

    it("scores no Opportunity twice, and none of the Player's own Moves", () => {
      for (const move of confronted().moves) {
        if (move.opportunityTerm !== null) {
          expect(move.opportunity, `ply ${move.ply}`).not.toBeNull();
          expect(move.unscored, `ply ${move.ply}`).toBe("opponent");
        }
      }
    });
  });
});
