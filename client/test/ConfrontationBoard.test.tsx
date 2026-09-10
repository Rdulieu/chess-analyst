import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConfrontationPage } from "../src/pages/ConfrontationPage";
import { CurrentProfileProvider } from "../src/features/profiles/CurrentProfileContext";
import { SEVERITY_SQUARE_TINT } from "../src/chess/severity";
import { DECLARED_SEVERITY_SQUARE_TINT } from "../src/features/personal/declaredSeverity";
import { stubConfrontation, NO_CLOCK } from "./support/confrontationStub";
import type { GameAnnotations, GameConfrontation, MoveAnnotation } from "../src/types";

/**
 * The board on the `Confrontation` route (US-26, slice 02).
 *
 * The screen used to answer "1 sur 4" and leave the Player unable to find the
 * other three: nothing on it said *which* Move produced *which* cell. The board
 * is the first half of the answer — the Moves are shown instead of imagined —
 * and it is held **exactly like the one on `Analyse`**: same controls, same
 * shortcuts, same list, same curve.
 *
 * The one thing that differs is **whose verdict paints the square**: the
 * Player's, never the engine's. One board, one author (ADR-0022).
 */

/** A Game whose PGN the board can actually walk. Four half-moves is enough. */
const PGN = "1. e4 e5 2. Nf3 Nc6";

/** The Player's own Game, as `/api/games/:id` serves it. */
const GAME = { id: 1, pgn: PGN, opponent: "opp", playerColor: "white" as const };

/** One annotated ply, with only what this screen reads filled in. */
function ply(over: Partial<MoveAnnotation> & { ply: number }): MoveAnnotation {
  return {
    whiteEval: { cp: 0, mate: null },
    whiteWinChances: 50,
    severity: null,
    bestLine: [],
    phase: "opening",
    counted: null,
    chancesLost: null,
    ...over,
  } as MoveAnnotation;
}

const ANNOTATIONS: GameAnnotations = {
  analyzed: true,
  regime: { depth: 16, lines: 2 },
  recap: {
    playerMoves: 2,
    countedMoves: 2,
    excluded: { forced: 0, decided: 0 },
    flaggedMoves: 1,
    countedErrors: 1,
    flaggedUncounted: { forced: 0, decided: 0 },
    chancesLost: 30,
    flaggedLoss: 30,
    drift: 0,
    regime: { depth: 16, lines: 2 },
  },
  // A Game with no Clock recorded: the time block is not what this slice is
  // about, and an absence is a legitimate shape rather than a hole.
  time: NO_CLOCK,
  plies: [
    ply({ ply: 0 }),
    // The Player is White, so ply 1 and 3 are theirs. The ENGINE measures a
    // Blunder on ply 1 — and the square must not show it.
    ply({ ply: 1, severity: "blunder", counted: { counted: true, reason: null }, chancesLost: 30 }),
    ply({ ply: 2 }),
    ply({ ply: 3, counted: { counted: true, reason: null }, chancesLost: 0 }),
    ply({ ply: 4 }),
  ],
};

const CONFRONTATION: GameConfrontation = {
  gameId: 1,
  sealedAt: "2026-08-25T10:00:00.000Z",
  provenance: "unaided",
  regime: { depth: 16, lines: 2 },
  severity: {
    countedMoves: 2,
    examined: 1,
    scorable: 1,
    agreed: 0,
    matrix: {
      blunder: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
      mistake: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
      inaccuracy: { blunder: 0, mistake: 0, inaccuracy: 1, none: 0 },
      sound: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
      good: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
    },
    unscored: { good: 0, opponent: 0 },
  },
  keyMoments: { marked: 0, damageFound: 0, damageTotal: 30, drift: 0, misses: [] },
  // Ply 1 is the one the tint test stands on: the Player called it an
  // Inaccuracy where the engine measured a Blunder — a Sous-lecture, and a
  // disagreement, so a board painting the wrong author cannot pass by luck.
  moves: [
    { ply: 1, notation: "e4", declared: "inaccuracy", measured: "blunder", term: "sous-lecture", unscored: null, keyMoment: { case: "missed", lost: 30, nearest: null } },
    { ply: 2, notation: "e5", declared: null, measured: "none", term: null, unscored: "opponent", keyMoment: null },
    { ply: 3, notation: "Nf3", declared: null, measured: "none", term: null, unscored: "silence", keyMoment: null },
    { ply: 4, notation: "Nc6", declared: null, measured: "none", term: null, unscored: "opponent", keyMoment: null },
  ],
  uncounted: [],
  posterior: [],
};

/**
 * The Player's own sealed reading, as `/api/personal/:gameId` serves it. The
 * board's tint comes from **here** — the verdict the Player wrote — and the
 * fixture deliberately disagrees with the engine on ply 1 so a board painting
 * the wrong author is caught rather than passing by coincidence.
 */
const READING = {
  gameId: 1,
  sealedAt: "2026-08-25T10:00:00.000Z",
  engineSeenBeforeSeal: false,
  marks: [
    { ply: 1, declaredSeverity: "inaccuracy", note: null, keyMoment: false, posterior: false },
  ],
};

function stub(over: { confrontation?: { status: number; body: unknown } } = {}) {
  stubConfrontation({
    confrontation: over.confrontation ?? { status: 200, body: CONFRONTATION },
    game: GAME,
    annotations: ANNOTATIONS,
    reading: READING,
  });
}

function renderPage() {
  localStorage.setItem("chess-analyst.current-profile", "3");
  return render(
    <CurrentProfileProvider>
      <MemoryRouter initialEntries={["/analyse/1/confrontation"]}>
        <Routes>
          <Route path="/analyse/:gameId/confrontation" element={<ConfrontationPage />} />
        </Routes>
      </MemoryRouter>
    </CurrentProfileProvider>,
  );
}

/** The board, once it has mounted — the page loads three records before it can. */
async function board(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector("[data-square]")).not.toBeNull());
  return container;
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("the board on the Confrontation route", () => {
  it("puts a board on the screen, at the starting Position", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    expect(container.querySelectorAll("[data-square]")).toHaveLength(64);
    // Nobody's Move yet: the readout names the start rather than a ply.
    expect(screen.getByLabelText("current move").textContent).toContain("Start");
  });

  it("steps through the Moves with the mouse, naming the Move reached", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(screen.getByLabelText("current move").textContent).toContain("1.e4"),
    );
  });

  it("steps with the same keys as the Analyse page, and says so", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    fireEvent.keyDown(document, { key: "ArrowRight" });
    await waitFor(() =>
      expect(screen.getByLabelText("current move").textContent).toContain("1.e4"),
    );

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    await waitFor(() =>
      expect(screen.getByLabelText("current move").textContent).toContain("Start"),
    );

    // A shortcut nothing on screen mentions does not exist (US-23, D6).
    expect(container.querySelector('[data-part="shortcuts"]')).not.toBeNull();
  });

  it("lists the Moves, numbered, and jumps to the one clicked", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    const list = screen.getByRole("list", { name: "moves" });
    const moves = [...list.querySelectorAll("button")].map((b) => b.textContent);
    expect(moves).toEqual(["1.e4", "1…e5", "2.Nf3", "2…Nc6"]);

    fireEvent.click(screen.getByRole("button", { name: "2.Nf3" }));
    await waitFor(() =>
      expect(screen.getByLabelText("current move").textContent).toContain("2.Nf3"),
    );
    // The current Move is findable in the list, not merely in the readout.
    expect(
      list.querySelector('button[aria-current="true"]')!.textContent,
    ).toBe("2.Nf3");
  });

  it("tints the destination square with the PLAYER's verdict, never the engine's", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    fireEvent.click(screen.getByRole("button", { name: "1.e4" }));

    // e4 is the destination of the Move being read. The Player called it an
    // Inaccuracy; the engine measured a Blunder. One board, one author.
    await waitFor(() => {
      const square = container.querySelector<HTMLElement>('[data-square="e4"] > div');
      // The PLAYER's table, named as such. Asserting the engine's passed only
      // because the two coincide on `inaccuracy` by design — a test that names
      // the wrong author is a test that stops meaning anything the day they part.
      expect(square!.style.backgroundColor).toBe(DECLARED_SEVERITY_SQUARE_TINT.inaccuracy);
    });
    expect(
      container.querySelector<HTMLElement>('[data-square="e4"] > div')!.style.backgroundColor,
    ).not.toBe(SEVERITY_SQUARE_TINT.blunder);
  });

  it("draws the curve, the winning-chances bar and the Phase ribbon", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    expect(container.querySelector('[data-part="curve"]')).not.toBeNull();
    expect(container.querySelector('[data-bar="winning-chances"]')).not.toBeNull();
    expect(container.querySelector('[data-part="phase-ribbon"]')).not.toBeNull();
  });

  it("names what the reading was worth on the Move being read", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    // Nobody's Move at the start: no cartouche rather than a neutral one that
    // says nothing.
    expect(container.querySelector('[data-part="reading-term"]')).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "1.e4" }));

    await waitFor(() => {
      const term = container.querySelector('[data-part="reading-term"]');
      // Declared Inaccuracy, measured Blunder — read milder than it was, and
      // named as UNDERESTIMATED rather than missed: the Player saw the danger.
      expect(term!.textContent).toBe("Bévue sous-estimée");
    });
    expect(container.querySelector('[data-part="reading-detail"]')!.textContent).toMatch(
      /plus petit qu'il n'était/i,
    );
  });

  it("puts the reading BELOW the step controls, which must never move (ADR-0021)", async () => {
    stub();
    const { container } = renderPage();
    await board(container);
    fireEvent.click(screen.getByRole("button", { name: "1.e4" }));
    await waitFor(() =>
      expect(container.querySelector('[data-part="reading-term"]')).not.toBeNull(),
    );

    const stepper = container.querySelector('[data-part="stepper"]')!;
    const reading = container.querySelector('[data-part="move-reading"]')!;
    // Document order is what holds the rule: a block that appears with the ply
    // cannot displace the buttons if it comes after them.
    expect(stepper.compareDocumentPosition(reading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("says an unscored Move's case AT that Move, naming it rather than going grey and mute", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    // The opponent's Move: the Player standing here must learn why no verdict
    // of theirs is scored, instead of meeting a blank.
    fireEvent.click(screen.getByRole("button", { name: "1…e5" }));
    await waitFor(() =>
      expect(container.querySelector('[data-part="reading-term"]')!.textContent).toBe(
        "Coup de l'adversaire",
      ),
    );

    // Silence, which is NOT the same fact as a `Good` and must not read as one.
    fireEvent.click(screen.getByRole("button", { name: "2.Nf3" }));
    await waitFor(() =>
      expect(container.querySelector('[data-part="reading-term"]')!.textContent).toBe("Rien dit"),
    );
    // One neutral tone for all five, so the words are what separate them.
    expect(
      container.querySelector('[data-part="reading-term"]')!.getAttribute("data-tone"),
    ).toBe("unscored");
  });

  it("shows the two families of cartouche together, told apart by the glyph", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    fireEvent.click(screen.getByRole("button", { name: "1.e4" }));

    await waitFor(() =>
      expect(container.querySelectorAll('[data-part="reading-term"]')).toHaveLength(2),
    );
    const [reading, keyMoment] = [
      ...container.querySelectorAll('[data-part="reading-term"]'),
    ];
    expect(reading.textContent).toBe("Bévue sous-estimée");
    expect(keyMoment.textContent).toBe("◆ Moment clé manqué");
    // Judging a Move well and looking in the right place are two abilities.
    // The glyph is what says which one is being answered — not the tone, which
    // the two families deliberately share.
    expect(keyMoment.getAttribute("data-family")).toBe("key-moment");
    expect(reading.getAttribute("data-family")).toBeNull();
  });

  it("shows no ◆ cartouche where there is neither a marker nor a loss", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    fireEvent.click(screen.getByRole("button", { name: "2.Nf3" }));

    await waitFor(() =>
      expect(container.querySelector('[data-part="reading-term"]')!.textContent).toBe("Rien dit"),
    );
    // Sixty cartouches saying "nothing here" would bury the ones that speak.
    expect(container.querySelectorAll('[data-part="reading-term"]')).toHaveLength(1);
  });

  describe("the divergences, findable without walking sixty Moves", () => {
    it("puts ONLY the disagreements on the curve, never the engine's severities", async () => {
      stub();
      const { container } = renderPage();
      await board(container);

      const marks = [...container.querySelectorAll("[data-mark-label]")];
      // Ply 1 diverges (declared Inaccuracy, measured Blunder). The engine also
      // measures a Blunder there — and that glyph must NOT be on the curve: the
      // curve already draws the engine's reading by its shape, and a second
      // copy would drown the handful of marks that are new.
      expect(marks).toHaveLength(1);
      expect(marks[0].getAttribute("data-mark-label")).toBe("sous-lecture");
      expect(marks[0].textContent).toBe("▼");
    });

    it("tells the two directions apart by their SHAPE, not their colour", async () => {
      stub({
        confrontation: {
          status: 200,
          body: {
            ...CONFRONTATION,
            moves: [
              { ply: 1, notation: "e4", declared: "inaccuracy", measured: "blunder", term: "sous-lecture", unscored: null, keyMoment: null },
              { ply: 3, notation: "Nf3", declared: "blunder", measured: "none", term: "sur-lecture", unscored: null, keyMoment: null },
            ],
          },
        },
      });
      const { container } = renderPage();
      await board(container);

      const glyphs = [...container.querySelectorAll("[data-mark-label]")].map(
        (mark) => mark.textContent,
      );
      // Over-reading danger and under-reading it are opposite faults, and no
      // rate separates them. Two forms, so the lean is readable with no colour.
      expect(new Set(glyphs)).toEqual(new Set(["▼", "▲"]));
    });

    it("titles the two authors' columns in the move list", async () => {
      stub();
      const { container } = renderPage();
      await board(container);

      const headings = container.querySelector('[data-part="move-list-headings"]');
      expect(headings!.textContent).toContain("Ma lecture");
      expect(headings!.textContent).toContain("Le moteur");
    });

    it("carries the disagreement glyph in the list too, named in words", async () => {
      stub();
      const { container } = renderPage();
      await board(container);

      const divergence = container.querySelector('[data-part="divergence"]');
      expect(divergence!.textContent).toBe("▼");
      // The shape carries it for the eye; the accessible name for everyone else.
      expect(divergence!.getAttribute("aria-label")).toBe("sous-lecture");
    });

    it("marks no agreement and nothing unscored — a forced Move is not a disagreement", async () => {
      stub({
        confrontation: {
          status: 200,
          body: {
            ...CONFRONTATION,
            moves: [
              { ply: 1, notation: "e4", declared: "sound", measured: "none", term: "bonne-lecture", unscored: null, keyMoment: null },
              // The story's central case: a forced catastrophe the Player
              // called Sound, and was right about. Putting it on the curve as
              // a divergence would accuse them of the one thing they got right.
              { ply: 3, notation: "Nf3", declared: "sound", measured: "blunder", term: null, unscored: "forced", keyMoment: null },
            ],
          },
        },
      });
      const { container } = renderPage();
      await board(container);

      expect(container.querySelectorAll("[data-mark-label]")).toHaveLength(0);
      expect(container.querySelector('[data-part="divergence"]')).toBeNull();
    });
  });

  it("carries no Review mode: the seal has fallen, everything is revealed", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    expect(container.querySelector('[data-part="review-mode"]')).toBeNull();
  });

  it("keeps the figures it already showed", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    expect(screen.getByRole("group", { name: /ce que j'ai examiné/i })).not.toBeNull();
    expect(screen.getByRole("group", { name: /ce que j'ai vu juste/i })).not.toBeNull();
  });

  it("still refuses, by name, when the reading is not sealed — and draws no board", async () => {
    stub({
      confrontation: {
        status: 409,
        body: { reason: "not-sealed", error: "Cette lecture n'est pas encore scellée." },
      },
    });
    const { container } = renderPage();

    await waitFor(() =>
      expect(container.querySelector('[data-part="confrontation-refused"]')).not.toBeNull(),
    );
    // A refused screen must not, in the same breath, draw the Game it refused.
    expect(container.querySelector("[data-square]")).toBeNull();
  });

  it("says a malfunction is a malfunction, not «cette partie n'est pas la vôtre»", async () => {
    // Before the board there was one call here, and falling back on "not yours"
    // was true. Three more can fail now, and this route's whole value is that
    // its refusals are NAMED — so a broken annotations read must not assert
    // something false about the Profile.
    stubConfrontation({
      confrontation: { status: 200, body: CONFRONTATION },
      game: GAME,
      annotations: ANNOTATIONS,
      reading: READING,
      failing: ["/api/games/1/annotations"],
    });
    const { container } = renderPage();

    await waitFor(() => expect(screen.getByRole("alert")).not.toBeNull());
    expect(screen.getByRole("alert").textContent).toMatch(/n'a pas pu être chargée/i);
    expect(screen.queryByText(/introuvable pour le profil/i)).toBeNull();
    expect(container.querySelector("[data-square]")).toBeNull();
  });

  it("still refuses, by name, when the Game is not analysed", async () => {
    stub({
      confrontation: {
        status: 409,
        body: { reason: "not-analyzed", error: "Cette partie n'est pas analysée." },
      },
    });
    const { container } = renderPage();

    await waitFor(() => {
      const refused = container.querySelector('[data-part="confrontation-refused"]');
      expect(refused!.getAttribute("data-reason")).toBe("not-analyzed");
    });
    expect(container.querySelector("[data-square]")).toBeNull();
  });
});
