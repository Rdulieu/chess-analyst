import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { openDb } from "../src/db";
import { getGameAnnotations } from "../src/annotations/repository";
import { getPersonalAnalysis } from "../src/personal/repository";
import { confrontGame, ConfrontationRefusal } from "../src/personal/confrontation";
import {
  seedConfrontationFixture,
  CONFRONTATION_FIXTURE_CASES,
  CONFRONTATION_FIXTURE_PLIES,
} from "../src/personal/confrontation-fixture";
import { gameNotations } from "../src/chess/positions";
import { seedProfile } from "./fixtures";
import { games, evaluations } from "../src/db/schema";

/**
 * The seeded fixture US-26 runs its Feature Paths on: **one analysed Game with a
 * sealed reading on it**, cut to carry the cases the engine does not produce on
 * command — a forced Move measured a `Blunder` and declared `Sound`, both
 * degree gaps, a false alarm, a `Good`, a verdict on the opponent, a marker on
 * nothing.
 *
 * **This test is why the fixture can be trusted.** Without it a case would go
 * missing in silence — a ply renumbered, an `Evaluation` retuned — and every
 * Feature Path resting on it would go green having exercised nothing. The cases
 * are asserted **one by one, by their ply**, so a disappearance names itself.
 *
 * What it does NOT claim: that the engine produces these cases. The
 * `Evaluation`s are fabricated. The real witness stays Game 715 of the live
 * database, opened by hand in the HP pass.
 */
describe("the seeded Confrontation fixture", () => {
  /**
   * The fixture seeded once and joined as the route joins it.
   *
   * Shared across the assertions rather than rebuilt per `it`: seeding replays
   * the PGN for thirty-six Positions and derives a `Best line` for each, which
   * cost 2.4 s a call and 40 s a file. Nothing here writes, so one seeding
   * answers them all — the two tests that DO write build their own database.
   */
  const confrontation = (() => {
    let cached: ReturnType<typeof build> | null = null;
    function build() {
      const { db } = openDb(":memory:");
      const profileId = seedProfile(db, "fixture-reader");
      const gameId = seedConfrontationFixture(db, profileId);

      const annotations = getGameAnnotations(db, gameId)!;
      const analysis = getPersonalAnalysis(db, gameId)!;
      const game = db.select().from(games).where(eq(games.id, gameId)).get()!;
      const result = confrontGame(analysis, annotations, gameNotations(game.pgn));
      if (result instanceof ConfrontationRefusal) throw new Error(`refused: ${result.reason}`);
      return { db, profileId, gameId, annotations, analysis, confrontation: result };
    }
    return () => (cached ??= build());
  })();

  it("seeds an analysed Game whose reading is sealed", () => {
    const { annotations, analysis } = confrontation();

    expect(annotations.analyzed).toBe(true);
    expect(analysis.sealedAt).not.toBeNull();
    // The provenance is explicit rather than left to a fallback: a comparison
    // with no provenance is not a comparison.
    expect(analysis.engineSeenBeforeSeal).toBe(false);
  });

  describe("the cases it exists for, each at its own ply", () => {
    /** What the engine measured on one ply, and whether the Move counts. */
    function measured(ply: number) {
      const { annotations } = confrontation();
      const move = annotations.plies[ply];
      return { severity: move.severity, counted: move.counted };
    }

    /** What the Player declared on one ply, in the sealed layer. */
    function declared(ply: number) {
      const { analysis } = confrontation();
      return analysis.marks.find((mark) => mark.ply === ply && !mark.posterior) ?? null;
    }

    it("a FORCED Move measured a Blunder, declared Sound — the case that settles the denominator", () => {
      const { forcedBlunderDeclaredSound: ply } = CONFRONTATION_FIXTURE_CASES;

      expect(measured(ply)).toEqual({
        severity: "blunder",
        counted: { counted: false, reason: "forced" },
      });
      expect(declared(ply)?.declaredSeverity).toBe("sound");
    });

    it("a Move played in an already-decided Position, carrying a verdict", () => {
      const { decidedWithVerdict: ply } = CONFRONTATION_FIXTURE_CASES;

      expect(measured(ply).counted).toEqual({ counted: false, reason: "decided" });
      expect(declared(ply)?.declaredSeverity).not.toBeNull();
    });

    it("a degree gap DOWNWARDS — a Mistake declared where a Blunder was measured", () => {
      const { underRead: ply } = CONFRONTATION_FIXTURE_CASES;

      expect(measured(ply)).toMatchObject({ severity: "blunder", counted: { counted: true } });
      expect(declared(ply)?.declaredSeverity).toBe("mistake");
    });

    it("a degree gap UPWARDS — a Blunder declared where a Mistake was measured", () => {
      const { overRead: ply } = CONFRONTATION_FIXTURE_CASES;

      expect(measured(ply)).toMatchObject({ severity: "mistake", counted: { counted: true } });
      expect(declared(ply)?.declaredSeverity).toBe("blunder");
    });

    it("a false alarm — a band declared where the engine flagged nothing", () => {
      const { falseAlarm: ply } = CONFRONTATION_FIXTURE_CASES;

      expect(measured(ply)).toMatchObject({ severity: null, counted: { counted: true } });
      expect(declared(ply)?.declaredSeverity).toBe("mistake");
    });

    it("a Good verdict — shown, counted as looked at, and never scored", () => {
      const { good: ply } = CONFRONTATION_FIXTURE_CASES;

      expect(measured(ply).counted).toMatchObject({ counted: true });
      expect(declared(ply)?.declaredSeverity).toBe("good");
    });

    it("a verdict on one of the OPPONENT's Moves", () => {
      const { opponentVerdict: ply } = CONFRONTATION_FIXTURE_CASES;

      // `null`, not `counted: false`: nothing at all is derived for the
      // opponent's play, which is not the same claim as "not counted".
      expect(measured(ply).counted).toBeNull();
      expect(declared(ply)?.declaredSeverity).not.toBeNull();
    });

    it("a counted Move the Player said nothing about — silence, not a verdict", () => {
      const { silence: ply } = CONFRONTATION_FIXTURE_CASES;

      expect(measured(ply).counted).toMatchObject({ counted: true });
      expect(declared(ply)).toBeNull();
    });

    it("an agreement — a verdict the engine confirms", () => {
      const { agreement: ply } = CONFRONTATION_FIXTURE_CASES;

      expect(measured(ply)).toMatchObject({ severity: "inaccuracy", counted: { counted: true } });
      expect(declared(ply)?.declaredSeverity).toBe("inaccuracy");
    });

    it("a written note, so the screen has one to render beside a verdict", () => {
      const { note: ply } = CONFRONTATION_FIXTURE_CASES;

      expect(declared(ply)?.note).toBeTruthy();
    });

    it("a Key moment landing on a real loss", () => {
      const { keyMomentFound: ply } = CONFRONTATION_FIXTURE_CASES;
      const { annotations } = confrontation();

      expect(declared(ply)?.keyMoment).toBe(true);
      expect(annotations.plies[ply].severity).not.toBeNull();
      expect(annotations.plies[ply].chancesLost).toBeGreaterThan(0);
    });

    it("a Key moment landing BESIDE the damage, with a fault left to name", () => {
      const { keyMomentAside: ply } = CONFRONTATION_FIXTURE_CASES;
      const { confrontation: result } = confrontation();

      expect(declared(ply)?.keyMoment).toBe(true);
      const miss = result.keyMoments.misses.find((entry) => entry.ply === ply);
      expect(miss).toBeDefined();
      expect(miss!.lostThere).toBe(0);
      // The distance is the whole point of showing it rather than crediting it.
      expect(miss!.nearest).not.toBeNull();
      expect(miss!.nearest!.ply).not.toBe(ply);
    });

    it("a costly fault NO marker points at — the damage the coverage figure misses", () => {
      const { keyMomentMissed: ply } = CONFRONTATION_FIXTURE_CASES;
      const { annotations, analysis } = confrontation();

      expect(annotations.plies[ply].severity).not.toBeNull();
      expect(annotations.plies[ply].counted).toMatchObject({ counted: true });
      expect(annotations.plies[ply].chancesLost).toBeGreaterThan(0);
      expect(analysis.marks.some((mark) => mark.ply === ply && mark.keyMoment)).toBe(false);
    });

    it("a marker on an uncounted Move, and one on the opponent's — neither earning anything", () => {
      const { markerOnUncounted, markerOnOpponent } = CONFRONTATION_FIXTURE_CASES;
      const { annotations } = confrontation();

      expect(declared(markerOnUncounted)?.keyMoment).toBe(true);
      expect(annotations.plies[markerOnUncounted].counted).toMatchObject({ counted: false });

      expect(declared(markerOnOpponent)?.keyMoment).toBe(true);
      expect(annotations.plies[markerOnOpponent].counted).toBeNull();
    });
  });

  it("is re-runnable: seeding twice duplicates nothing and keeps the same figures", () => {
    const { db } = openDb(":memory:");
    const profileId = seedProfile(db, "fixture-reader");

    const first = seedConfrontationFixture(db, profileId);
    const second = seedConfrontationFixture(db, profileId);

    // The same Game, not a second one: re-seeding refreshes, it does not pile up.
    expect(second).toBe(first);
    expect(db.select().from(games).all()).toHaveLength(1);
    expect(
      db.select().from(evaluations).all().filter((row) => row.gameId === first),
    ).toHaveLength(CONFRONTATION_FIXTURE_PLIES + 1);
  });

  it("leaves every other Profile's data alone", () => {
    const { db } = openDb(":memory:");
    const other = seedProfile(db, "someone-else");
    const otherGame = db
      .insert(games)
      .values({
        profileId: other,
        gameUrl: "https://example.test/their-game",
        pgn: "1. e4 e5",
        opponent: "opp",
        playerColor: "white",
        result: "win",
        date: "2026-01-01",
        timeControlCategory: "blitz",
        analyzed: true,
      })
      .returning({ id: games.id })
      .get();

    const profileId = seedProfile(db, "fixture-reader");
    seedConfrontationFixture(db, profileId);
    seedConfrontationFixture(db, profileId);

    // ADR-0014: the fixture is filed under its own Profile, and touching another
    // Player's history would be the one thing a seed must never do.
    expect(db.select().from(games).all().filter((row) => row.profileId === other)).toEqual([
      expect.objectContaining({ id: otherGame.id }),
    ]);
  });
});
