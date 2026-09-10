import { describe, it, expect } from "vitest";
import { openDb } from "../src/db";
import { getGameAnnotations } from "../src/annotations/repository";
import { getPersonalAnalysis } from "../src/personal/repository";
import {
  confrontGame,
  ConfrontationRefusal,
  MEASURED_LABELS,
  type GameConfrontation,
  type MoveReading,
} from "../src/personal/confrontation";
import { seedConfrontationFixture, CONFRONTATION_FIXTURE_CASES } from "../src/personal/fixture";
import { DECLARED_SEVERITIES } from "../src/personal/severity";
import { gameNotations } from "../src/chess/positions";
import { seedProfile } from "./fixtures";
import { games } from "../src/db/schema";
import { eq } from "drizzle-orm";

/**
 * **The `Confrontation` of one Game keeps the reading of every Move, and its
 * figures are the sum of that list** (ADR-0032).
 *
 * The derivation used to walk the Moves, increment four counters and throw the
 * pair away. Nothing new is walked here and no table is added: it is the same
 * single pass, which now **keeps** what it computes. That is what lets the
 * screen answer "1 sur 4" with the four Moves — and what makes the per-Move
 * view and the aggregate incapable of diverging, because they are one
 * derivation read at two altitudes rather than two that agree by luck.
 */
describe("the per-Move reading of a Confrontation", () => {
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

  /** The entry for one ply — the lookup the screen itself performs. */
  const at = (ply: number): MoveReading => {
    const entry = confronted().moves.find((move) => move.ply === ply);
    if (!entry) throw new Error(`no reading for ply ${ply}`);
    return entry;
  };

  describe("what each entry carries", () => {
    it("holds one entry per half-move, the starting Position excepted", () => {
      const { moves } = confronted();

      // Ply 0 is nobody's Move. Every other ply has an entry — including the
      // opponent's, which is what lets the screen say "coup de l'adversaire"
      // rather than going silent on a Move the Player is standing on.
      expect(moves.map((move) => move.ply)).toEqual(
        Array.from({ length: 35 }, (_, i) => i + 1),
      );
    });

    it("names the Move, so an entry is readable without the Game beside it", () => {
      expect(at(11).notation).toBe("Kxf2");
      expect(at(1).notation).toBe("g3");
    });

    it("carries the declared verdict and the measured label side by side", () => {
      const { underRead } = CONFRONTATION_FIXTURE_CASES;

      expect(at(underRead)).toMatchObject({ declared: "mistake", measured: "blunder" });
    });

    it("says «nothing flagged» as a fact rather than as an absence", () => {
      const { falseAlarm } = CONFRONTATION_FIXTURE_CASES;

      // The fourth column. It is what makes `Sound` scorable at all.
      expect(at(falseAlarm).measured).toBe("none");
    });

    it("gives every entry exactly one of a term and an unscored reason", () => {
      // The invariant that stops a Move being both scored and excused, or
      // neither — and the one a reader relies on when branching on `term`.
      for (const move of confronted().moves) {
        expect(
          (move.term === null) !== (move.unscored === null),
          `ply ${move.ply} has term=${move.term} and unscored=${move.unscored}`,
        ).toBe(true);
      }
    });
  });

  describe("the term, following the comparison already shipped", () => {
    it("calls an agreement a Bonne lecture, on the band and on «nothing flagged»", () => {
      const { agreement } = CONFRONTATION_FIXTURE_CASES;

      expect(at(agreement).term).toBe("bonne-lecture");
      // `Sound` against nothing flagged is an agreement — the entire reason
      // `Sound` is a value the Player poses.
      expect(at(1)).toMatchObject({ declared: "sound", measured: "none", term: "bonne-lecture" });
    });

    it("calls a milder verdict than measured a Sous-lecture", () => {
      const { underRead } = CONFRONTATION_FIXTURE_CASES;

      expect(at(underRead).term).toBe("sous-lecture");
    });

    it("calls a harder verdict than measured a Sur-lecture", () => {
      const { overRead, falseAlarm } = CONFRONTATION_FIXTURE_CASES;

      expect(at(overRead).term).toBe("sur-lecture");
      // A band declared where the engine flagged nothing is the same fault in
      // its purest form: the Player saw danger that was not there.
      expect(at(falseAlarm).term).toBe("sur-lecture");
    });

    it("opens no tolerance window — one band apart is still a divergence", () => {
      const { overRead } = CONFRONTATION_FIXTURE_CASES;

      // `Blunder` declared, `Mistake` measured. Adjacent, and still not an
      // agreement: the accuracy figure already shipped does not move a hair.
      expect(at(overRead)).toMatchObject({ declared: "blunder", measured: "mistake" });
      expect(at(overRead).term).not.toBe("bonne-lecture");
    });
  });

  describe("what nothing scores, kept apart by reason", () => {
    it("names each of the five cases at its own ply", () => {
      const cases = CONFRONTATION_FIXTURE_CASES;

      expect(at(cases.forcedBlunderDeclaredSound).unscored).toBe("forced");
      expect(at(cases.decidedWithVerdict).unscored).toBe("decided");
      expect(at(cases.opponentVerdict).unscored).toBe("opponent");
      expect(at(cases.good).unscored).toBe("good");
      expect(at(cases.silence).unscored).toBe("silence");
    });

    it("keeps the Player's verdict on a forced Move — the case that settles the denominator", () => {
      const { forcedBlunderDeclaredSound } = CONFRONTATION_FIXTURE_CASES;

      // A forced catastrophe measures a Blunder and is nobody's mistake, so a
      // Player calling it `Sound` is RIGHT. The screen can only say so if the
      // verdict is still here — and it carries no term, so nothing scores it
      // against them.
      expect(at(forcedBlunderDeclaredSound)).toMatchObject({
        declared: "sound",
        measured: "blunder",
        unscored: "forced",
        term: null,
      });
    });

    it("keeps silence and Good apart — they are not the same fact", () => {
      const { silence, good } = CONFRONTATION_FIXTURE_CASES;

      expect(at(silence).declared).toBeNull();
      expect(at(good).declared).toBe("good");
    });
  });

  /**
   * **Why the "nearest loss" search excludes what it excludes.**
   *
   * `namedFault` skips the queried ply and any fault that cost nothing. A
   * review read those as fixes to a live defect — a marker naming *itself* as
   * the nearest loss, or a "loss" worth zero points. Measured here rather than
   * argued: **both are unreachable**, because a flagged Move always costs
   * something.
   *
   * That is not a coincidence. `moveSeverities` calls
   * `classifyMove(before, 100 - after)` and `chancesLostByMove` subtracts the
   * very same pair, so severity and cost are **one quantity read twice**: a
   * band of 5 or more *is* a loss of 5 or more. A marked fault therefore always
   * has `lost > 0` and is answered `found` long before any distance is sought.
   *
   * The exclusions stay, as the assertion that this remains true. If the two
   * derivations are ever pulled apart — a severity that means something other
   * than a drop — this test goes red **and** the exclusions start doing real
   * work, which is exactly the order one wants.
   */
  it("a flagged counted Move always costs something, so no fault can be worth zero", () => {
    const flagged = confronted().moves.filter(
      (move) => move.measured !== "none" && move.unscored === null,
    );

    expect(flagged.length).toBeGreaterThan(0);
    for (const move of flagged) {
      expect(
        move.keyMoment,
        `ply ${move.ply} is flagged and counted, so it must carry a cost`,
      ).not.toBeNull();
      expect(move.keyMoment!.lost).toBeGreaterThan(0);
    }
  });

  describe("what the Key moments were worth, Move by Move", () => {
    it("credits a marker that landed on a real, costly fault", () => {
      const { keyMomentFound } = CONFRONTATION_FIXTURE_CASES;

      expect(at(keyMomentFound).keyMoment).toMatchObject({ case: "found" });
      expect(at(keyMomentFound).keyMoment!.lost).toBeGreaterThan(0);
    });

    it("shows the DISTANCE when a marker landed beside the damage, rather than crediting it", () => {
      const { keyMomentAside } = CONFRONTATION_FIXTURE_CASES;
      const reading = at(keyMomentAside).keyMoment!;

      expect(reading.case).toBe("aside");
      expect(reading.lost).toBe(0);
      // "Your marker is on 21.Rd1, which cost nothing — the loss is on 22.Nxe5"
      // says more than a silent partial credit, and keeps the score additive.
      expect(reading.nearest).not.toBeNull();
      expect(reading.nearest!.lost).toBeGreaterThan(0);
      expect(reading.nearest!.ply).not.toBe(keyMomentAside);
    });

    it("names a marker on the opponent's Move for what it is, not as a near miss", () => {
      const { markerOnOpponent } = CONFRONTATION_FIXTURE_CASES;

      // Calling this "beside the damage" would send the Player looking for a
      // mistake they did not make.
      expect(at(markerOnOpponent).keyMoment).toMatchObject({ case: "on-opponent" });
    });

    it("names a marker on an uncounted Move for what it is", () => {
      const { markerOnUncounted } = CONFRONTATION_FIXTURE_CASES;

      expect(at(markerOnUncounted).keyMoment).toMatchObject({ case: "on-uncounted" });
    });

    it("**shows the damage no marker points at** — the case that was missing", () => {
      const { keyMomentMissed } = CONFRONTATION_FIXTURE_CASES;
      const reading = at(keyMomentMissed).keyMoment!;

      // "Your markers found 30% of the damage" had no Move to show for the
      // other 70%. This is it.
      expect(reading.case).toBe("missed");
      expect(reading.lost).toBeGreaterThan(0);
    });

    it("says nothing at all where there is neither a marker nor a loss", () => {
      const { silence } = CONFRONTATION_FIXTURE_CASES;

      // Sixty cartouches reading "nothing here" would bury the six that speak.
      expect(at(silence).keyMoment).toBeNull();
    });

    it("**folds**: the damage found plus the damage missed IS the total already served", () => {
      const { moves, keyMoments } = confronted();
      const sum = (kase: string) =>
        moves
          .filter((move) => move.keyMoment?.case === kase)
          .reduce((total, move) => total + move.keyMoment!.lost, 0);

      // The ticket's own requirement, and the reason `missed` belongs in the
      // per-Move list rather than beside it: found + missed exhausts the
      // flagged loss, so the coverage rate can be read off the Moves.
      expect(sum("found") + sum("missed")).toBeCloseTo(keyMoments.damageTotal, 6);
      expect(sum("found")).toBeCloseTo(keyMoments.damageFound, 6);
    });

    it("leaves the coverage figures untouched", () => {
      const { keyMoments } = confronted();

      // This slice renders what was already derived and adds one case; it
      // retunes nothing. `marked` counts every marker, wherever it landed.
      expect(keyMoments.marked).toBe(4);
      expect(keyMoments.misses).toHaveLength(3);
    });
  });

  /**
   * **The assertion ADR-0032 exists for.** Each figure is re-derived from the
   * per-Move list alone and must land exactly on the one served. If these ever
   * disagree, the screen and the summary are telling the Player two different
   * stories about the same Game.
   */
  describe("the figures ARE the sum of the list", () => {
    /** The entries the accuracy figures are computed over. */
    const examinedMoves = () =>
      confronted().moves.filter(
        (move) => move.declared !== null && !["opponent", "forced", "decided"].includes(move.unscored ?? ""),
      );

    it("re-derives `examined` from the list", () => {
      expect(examinedMoves()).toHaveLength(confronted().severity.examined);
    });

    it("re-derives `scorable` from the list", () => {
      const scorable = examinedMoves().filter((move) => move.unscored !== "good");

      expect(scorable).toHaveLength(confronted().severity.scorable);
    });

    it("re-derives `agreed` from the list", () => {
      const agreed = confronted().moves.filter((move) => move.term === "bonne-lecture");

      expect(agreed).toHaveLength(confronted().severity.agreed);
    });

    it("re-derives every cell of the matrix from the list", () => {
      const { matrix } = confronted().severity;

      for (const declared of DECLARED_SEVERITIES) {
        for (const label of MEASURED_LABELS) {
          const cell = examinedMoves().filter(
            (move) => move.declared === declared && move.measured === label,
          );
          expect(cell, `cell ${declared}/${label}`).toHaveLength(matrix[declared][label]);
        }
      }
    });

    it("re-derives `unscored.good` and `unscored.opponent` from the list", () => {
      const { unscored } = confronted().severity;
      const moves = confronted().moves;

      expect(moves.filter((move) => move.unscored === "good")).toHaveLength(unscored.good);
      // Only those CARRYING a verdict: an opponent Move the Player said nothing
      // about is not a verdict that went unscored.
      expect(
        moves.filter((move) => move.unscored === "opponent" && move.declared !== null),
      ).toHaveLength(unscored.opponent);
    });

    it("re-derives the uncounted list from the list", () => {
      const fromMoves = confronted()
        .moves.filter((move) => move.unscored === "forced" || move.unscored === "decided")
        .map((move) => move.ply);

      expect(fromMoves).toEqual(confronted().uncounted.map((move) => move.ply));
    });
  });
});
