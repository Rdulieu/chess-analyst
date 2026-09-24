import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, configure } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConfrontationPage } from "../src/pages/ConfrontationPage";
import { CurrentProfileProvider } from "../src/features/profiles/CurrentProfileContext";
import { OPPORTUNITY_TERM } from "../src/chess/opportunity";
import { DECLARED_SEVERITY_SQUARE_TINT } from "../src/features/personal/declaredSeverity";
import { stubConfrontation, NO_CLOCK } from "./support/confrontationStub";
import type { GameAnnotations, GameConfrontation, MoveAnnotation } from "../src/types";

/**
 * **The `Opportunity` at the screen** (US-30, ticket 04) — three sites, and not
 * one more.
 *
 * Every assertion here starts from a **fabricated API response** and reads the
 * **rendered text**: the ticket names the trap in advance, because three of
 * US-26's eleven blocking findings were fixes that never reached the screen. A
 * test that checked the field was present in the payload would have passed on
 * all three.
 *
 * And three things must be **anchored as unchanged**: the curve gains no glyph,
 * the board square keeps the Player's tint, and no forbidden word appears.
 */

const PGN = "1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Nc3 Nf6";
const GAME = { id: 1, pgn: PGN, opponent: "opp", playerColor: "white" as const };

function ply(over: Partial<MoveAnnotation> & { ply: number }): MoveAnnotation {
  return {
    whiteEval: { cp: 0, mate: null },
    whiteWinChances: 50,
    severity: null,
    bestLine: [],
    phase: "opening",
    counted: null,
    chancesLost: null,
    opportunity: null,
    ...over,
  } as MoveAnnotation;
}

/**
 * The Player is White, so the **even** plies are the opponent's. Three of them
 * carry an `Opportunity`, one per reading outcome — seen and well read, seen and
 * under-read, never looked at — and ply 1 carries one of the Player's own
 * `Blunder`s so the two subjects can be told apart on one screen.
 */
const ANNOTATIONS: GameAnnotations = {
  analyzed: true,
  regime: { depth: 16, lines: 2 },
  recap: {
    playerMoves: 4,
    countedMoves: 4,
    excluded: { forced: 0, decided: 0 },
    flaggedMoves: 1,
    countedErrors: 1,
    flaggedUncounted: { forced: 0, decided: 0 },
    chancesLost: 30,
    flaggedLoss: 30,
    drift: 0,
    opportunities: { total: 3, bySeverity: { inaccuracy: 1, mistake: 0, blunder: 2 } },
    // Every Move of this fixture is in the Early game, and the Game never
    // leaves it: the two other Phases are NOT REACHED, not zero (US-32).
    byPhase: {
      early: { chancesLost: 30, flaggedLoss: 30, drift: 0, countedErrors: 1, opportunities: { total: 3, bySeverity: { inaccuracy: 1, mistake: 0, blunder: 2 } } },
      middlegame: null,
      endgame: null,
    },
    // No Endgame, so no configuration at all — `null`, not an empty list (US-32).
    bySignature: null,
    regime: { depth: 16, lines: 2 },
  },
  time: NO_CLOCK,
  plies: [
    ply({ ply: 0 }),
    ply({ ply: 1, severity: "blunder", counted: { counted: true, reason: null }, chancesLost: 30 }),
    // Seen and well read.
    ply({ ply: 2, opportunity: { severity: "blunder" } }),
    ply({ ply: 3, counted: { counted: true, reason: null }, chancesLost: 0 }),
    // Seen and under-read — the Player called it an Inaccuracy.
    ply({ ply: 4, opportunity: { severity: "blunder" } }),
    ply({ ply: 5, counted: { counted: true, reason: null }, chancesLost: 0 }),
    // Never looked at.
    ply({ ply: 6, opportunity: { severity: "inaccuracy" } }),
    ply({ ply: 7, counted: { counted: true, reason: null }, chancesLost: 0 }),
    // An opponent Move that offered nothing at all.
    ply({ ply: 8 }),
  ],
};

const CONFRONTATION: GameConfrontation = {
  gameId: 1,
  sealedAt: "2026-08-25T10:00:00.000Z",
  provenance: "unaided",
  regime: { depth: 16, lines: 2 },
  severity: {
    countedMoves: 4,
    examined: 1,
    scorable: 1,
    agreed: 0,
    matrix: {
      blunder: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
      mistake: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
      inaccuracy: { blunder: 1, mistake: 0, inaccuracy: 0, none: 0 },
      sound: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
      good: { blunder: 0, mistake: 0, inaccuracy: 0, none: 0 },
    },
    unscored: { good: 0, opponent: 0 },
  },
  keyMoments: { marked: 0, damageFound: 0, damageTotal: 30, drift: 0, misses: [] },
  // Three offered, two examined, one of those read on the band, one never seen.
  opportunities: { offered: 3, examined: 2, agreed: 1, unseen: 1 },
  moves: [
    { ply: 1, notation: "e4", declared: "inaccuracy", measured: "blunder", term: "sous-lecture", unscored: null, keyMoment: null, opportunity: null, opportunityTerm: null },
    // **Scored, therefore NOT unscored** (slice 06). A payload carrying both
    // was the root of HP-03's first blocking finding, and it is not a shape the
    // server can produce any more.
    { ply: 2, notation: "e5", declared: "blunder", measured: "none", term: null, unscored: null, keyMoment: null, opportunity: "blunder", opportunityTerm: "bonne-lecture" },
    { ply: 3, notation: "Nf3", declared: null, measured: "none", term: null, unscored: "silence", keyMoment: null, opportunity: null, opportunityTerm: null },
    { ply: 4, notation: "Nc6", declared: "inaccuracy", measured: "none", term: null, unscored: null, keyMoment: null, opportunity: "blunder", opportunityTerm: "sous-lecture" },
    { ply: 5, notation: "Bc4", declared: null, measured: "none", term: null, unscored: "silence", keyMoment: null, opportunity: null, opportunityTerm: null },
    { ply: 6, notation: "Bc5", declared: null, measured: "none", term: null, unscored: "opponent", keyMoment: null, opportunity: "inaccuracy", opportunityTerm: null },
    { ply: 7, notation: "Nc3", declared: null, measured: "none", term: null, unscored: "silence", keyMoment: null, opportunity: null, opportunityTerm: null },
    { ply: 8, notation: "Nf6", declared: null, measured: "none", term: null, unscored: "opponent", keyMoment: null, opportunity: null, opportunityTerm: null },
  ],
  uncounted: [],
  posterior: [],
};

/**
 * The Player's sealed reading. Ply 2 carries the verdict that made the
 * `Opportunity` well read — and it is a **verdict on an opponent Move**, which
 * is the 40 % of marks this whole story exists for.
 */
const READING = {
  gameId: 1,
  sealedAt: "2026-08-25T10:00:00.000Z",
  engineSeenBeforeSeal: false,
  marks: [
    { ply: 1, declaredSeverity: "inaccuracy", note: null, keyMoment: false, posterior: false },
    { ply: 2, declaredSeverity: "blunder", note: null, keyMoment: false, posterior: false },
    { ply: 4, declaredSeverity: "inaccuracy", note: null, keyMoment: false, posterior: false },
  ],
};

function stub() {
  stubConfrontation({
    confrontation: { status: 200, body: CONFRONTATION },
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

configure({ asyncUtilTimeout: 5000 });

/** The board mounts a beat after the text settles — wait on the subject. */
async function board(container: HTMLElement) {
  await waitFor(() => expect(container.querySelectorAll("[data-square]")).toHaveLength(64), {
    timeout: 5000,
  });
}

/** The row of the move list for one ply, keyed on the SAN the button carries. */
function rowFor(container: HTMLElement, name: string): HTMLElement {
  const button = screen.getByRole("button", { name });
  return button.closest("li") as HTMLElement;
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("site 1 — the « Le moteur » column", () => {
  it("names the Opportunity on the opponent's ply, with the word and the glyph", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    const cell = rowFor(container, "1…e5").querySelector('[data-cell="engine"]');
    const mark = cell!.querySelector('[data-part="opportunity"]');
    expect(mark).not.toBeNull();
    // The rendered TEXT, not the payload: the word and the glyph, both from the
    // modules that own them.
    // Literals, not the functions the component itself calls: an expectation
    // computed by `opportunityGlyph` would agree with any word that module
    // produced, which is the tautology US-26 was burned by. These are the words
    // the ticket asks for, written down.
    expect(mark!.textContent).toBe("?? Opportunity");
  });

  it("gives it an accessible name that tells it from a fault of the Player's", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    const opportunity = rowFor(container, "1…e5").querySelector('[data-part="opportunity"]');
    expect(opportunity!.getAttribute("aria-label")).toBe(
      "Opportunity de la taille d'une bévue",
    );
    // The Player's own Blunder on ply 1 keeps the name it always had. Two
    // subjects, two names — read aloud, they cannot be confused.
    const own = rowFor(container, "1.e4").querySelector('[data-cell="engine"] [data-severity]');
    expect(own!.getAttribute("aria-label")).toBe("blunder");
    expect(own!.getAttribute("aria-label")).not.toBe(
      "Opportunity de la taille d'une bévue",
    );
  });

  it("does not wear the Player's own severity hook, which the sheet fills", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    const mark = rowFor(container, "1…e5").querySelector('[data-part="opportunity"]')!;
    // `_semantics` tints ANY `[data-severity]` into a filled chip in the fault
    // colours. Measured in the browser before this assertion existed: the
    // `Opportunity` rendered on `--tint-mistake` behind `--ink-muted`, the one
    // colour on this screen that means « your fault ». jsdom loads no sheet, so
    // what is testable here is the hook, and the hook is the cause.
    expect(mark.getAttribute("data-severity")).toBeNull();
    expect(mark.getAttribute("data-opportunity")).toBe("blunder");
  });

  it("says nothing on an opponent Move that offered nothing", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    expect(rowFor(container, "4…Nf6").querySelector('[data-part="opportunity"]')).toBeNull();
  });

  it("puts no Opportunity on the Player's own Moves", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    expect(rowFor(container, "1.e4").querySelector('[data-part="opportunity"]')).toBeNull();
  });
});

describe("site 2 — the cartouche under the board", () => {
  it("names the Opportunity with the SAME word the list uses", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    fireEvent.click(screen.getByRole("button", { name: "1…e5" }));

    const chip = await waitFor(() => {
      const found = container.querySelector(
        '[data-part="move-reading"] [data-part="reading-term"][data-family="opportunity"]',
      );
      expect(found).not.toBeNull();
      return found!;
    });
    // One fact, read twice — so the two readings must be the same string.
    const inList = rowFor(container, "1…e5").querySelector('[data-part="opportunity"]');
    expect(chip.textContent).toContain(OPPORTUNITY_TERM);
    expect(inList!.textContent).toContain(OPPORTUNITY_TERM);
    // And the cartouche, which has the room, spells the size out.
    expect(chip.textContent).toBe("?? Opportunity de la taille d'une bévue");
  });

  it("says what the reading was worth there, in the three shared terms", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    fireEvent.click(screen.getByRole("button", { name: "1…e5" }));
    await waitFor(() =>
      expect(
        container.querySelector('[data-part="reading-term"][data-family="opportunity-reading"]')!
          .textContent,
      ).toContain("Bonne lecture"),
    );

    // The same Move, under-read: the other of the three terms, and never fused
    // with the Player's own `term` — which is `null` on an opponent ply.
    fireEvent.click(screen.getByRole("button", { name: "2…Nc6" }));
    await waitFor(() =>
      expect(
        container.querySelector('[data-part="reading-term"][data-family="opportunity-reading"]')!
          .textContent,
      ).toContain("Sous-lecture"),
    );
  });

  it("names the Opportunity but no verdict where the Player never looked", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    fireEvent.click(screen.getByRole("button", { name: "3…Bc5" }));
    await waitFor(() =>
      expect(
        container.querySelector('[data-part="reading-term"][data-family="opportunity"]'),
      ).not.toBeNull(),
    );
    // Never looked at is not misjudged: there is no term to show, and inventing
    // one would score a silence.
    expect(
      container.querySelector('[data-part="reading-term"][data-family="opportunity-reading"]'),
    ).toBeNull();
  });

  it("keeps the Player's own cartouche untouched on the Player's own Move", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    fireEvent.click(screen.getByRole("button", { name: "1.e4" }));
    await waitFor(() =>
      expect(container.querySelector('[data-part="reading-term"]')!.textContent).toBe(
        "Bévue sous-estimée",
      ),
    );
    expect(
      container.querySelectorAll('[data-part="reading-term"][data-family^="opportunity"]'),
    ).toHaveLength(0);
  });
});

describe("site 3 — the block of figures", () => {
  it("shows the opponent pair, raw with its denominator", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    const block = container.querySelector('[data-part="confrontation-opportunities"]')!;
    expect(block).not.toBeNull();
    const text = block.textContent!;
    // Coverage: 2 of the 3 offered. Accuracy: 1 of those 2. The counts travel
    // with the rates — a bare percentage hides the size of the sample.
    expect(text).toContain("2 sur 3");
    expect(text).toContain("1 sur 2");
  });

  it("says how many were never looked at", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    const block = container.querySelector('[data-part="confrontation-opportunities"]')!;
    // "Missed" and "never seen" are different failures, and only the second is
    // invisible to a reading (CONTEXT.md).
    expect(block.textContent).toContain("1 n'a jamais été regardée");
  });

  it("never fuses the opponent pair into « Ce que j'ai vu juste »", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    const own = container.querySelector('[data-part="confrontation-severity"]')!;
    // The Player's own grid keeps exactly the three figures US-26 put in it.
    expect(own.querySelectorAll('[data-part="figure"]')).toHaveLength(2);
    expect(own.querySelector('[data-part="confrontation-opportunities"]')).toBeNull();
    // The Player's accuracy still reads its own numbers, undisturbed.
    expect(
      container.querySelector('[data-part="figure"][aria-label="Ce que j\'ai vu juste"]')!
        .textContent,
    ).toContain("0 sur 1");
  });
});

describe("the three prohibitions", () => {
  it("adds NO glyph to the curve", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    // Only the Player's own divergence on ply 1 — the three Opportunities put
    // nothing on the drawing. The curve speaks of the Player's Game.
    const marks = [...container.querySelectorAll("[data-mark-label]")];
    expect(marks).toHaveLength(1);
    expect(marks[0].getAttribute("data-mark-label")).toBe("sous-lecture");
  });

  it("leaves the board square's tint to the Player, on an opponent ply too", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    // Ply 2 is the opponent's, carries an `Opportunity` the size of a Blunder,
    // AND carries the Player's own `blunder` verdict. One board, one author
    // (ADR-0022): the square shows the Player's verdict, and the Opportunity
    // changes nothing about it.
    fireEvent.click(screen.getByRole("button", { name: "1…e5" }));
    await waitFor(() => {
      const square = container.querySelector<HTMLElement>('[data-square="e5"] div');
      expect(square!.style.backgroundColor).toBe(DECLARED_SEVERITY_SQUARE_TINT.blunder);
    });
  });

  it("uses none of the three forbidden phrasings anywhere on the screen", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    fireEvent.click(screen.getByRole("button", { name: "1…e5" }));
    await waitFor(() =>
      expect(
        container.querySelector('[data-part="reading-term"][data-family="opportunity"]'),
      ).not.toBeNull(),
    );
    const text = container.textContent!.toLowerCase();
    for (const banned of ["erreur de l'adversaire", "cadeau", "chance manquée"]) {
      expect(text).not.toContain(banned);
    }
  });
});

/**
 * **The column and the cartouche say the same thing about the same ply**
 * (slice 06, HP-03's first blocking finding).
 *
 * The move list printed « Coup de l'adversaire » in its Confrontation column on
 * a ply whose cartouche, three centimetres away, read « ?! Sur-lecture ». One
 * screen said the verdict was scored and unscored at once — the pre-US-30
 * doctrine surviving beside its own replacement.
 *
 * Anchored on the **rendered text of both**, from one fabricated payload: a
 * test that checked either alone would have passed while they disagreed.
 */
describe("the two surfaces agree on the ply they are both describing", () => {
  const CELL = '[data-part="confrontation-cell"]';

  it("prints the verdict in the column, never the grey, on a scored opponent ply", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    const cell = rowFor(container, "1…e5").querySelector(CELL)!;
    expect(cell.textContent).toContain("Bonne lecture");
    expect(cell.textContent).not.toContain("Coup de l'adversaire");
    expect(cell.getAttribute("data-tone")).toBe("agreement");
  });

  it("matches the cartouche word for word, on both scored opponent plies", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    for (const san of ["1…e5", "2…Nc6"]) {
      fireEvent.click(screen.getByRole("button", { name: san }));
      const chip = await waitFor(() => {
        const found = container.querySelector(
          '[data-part="reading-term"][data-family="opportunity-reading"]',
        );
        expect(found).not.toBeNull();
        return found!;
      });
      const cell = rowFor(container, san).querySelector(CELL)!;

      // The same string and the same register — they read one function, and
      // this is what proves it rather than assuming it.
      expect(cell.textContent).toContain(chip.textContent!);
      expect(cell.getAttribute("data-tone")).toBe(chip.getAttribute("data-tone"));
    }
  });

  it("states the verdict once under the board, not twice", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    fireEvent.click(screen.getByRole("button", { name: "1…e5" }));
    await waitFor(() =>
      expect(
        container.querySelector('[data-part="reading-term"][data-family="opportunity-reading"]'),
      ).not.toBeNull(),
    );
    const chips = [
      ...container.querySelectorAll('[data-part="move-reading"] [data-part="reading-term"]'),
    ].map((chip) => chip.textContent);

    // The offered chip and the verdict chip — and no third chip repeating the
    // verdict because the Player's own table was asked a question about the
    // opponent's Move.
    expect(chips).toEqual([
      "?? Opportunity de la taille d'une bévue",
      "?? Bonne lecture",
    ]);
  });

  it("keeps the grey on the opponent ply nothing scored", async () => {
    stub();
    const { container } = renderPage();
    await board(container);

    // Ply 6 offers an `Opportunity` the Player never looked at, ply 8 offers
    // nothing at all: neither is scored, so both keep the case that names them.
    for (const san of ["3…Bc5", "4…Nf6"]) {
      const cell = rowFor(container, san).querySelector(CELL)!;
      expect(cell.textContent, san).toContain("Coup de l'adversaire");
      expect(cell.getAttribute("data-tone"), san).toBe("unscored");
    }
  });
});
