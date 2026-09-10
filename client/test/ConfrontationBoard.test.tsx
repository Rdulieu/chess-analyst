import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ConfrontationPage } from "../src/pages/ConfrontationPage";
import { CurrentProfileProvider } from "../src/features/profiles/CurrentProfileContext";
import { SEVERITY_SQUARE_TINT } from "../src/chess/severity";
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
  time: {
    timeControl: null,
    plies: [],
    absence: "not-recorded",
    precision: null,
    reading: null,
  },
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
  const answer = over.confrontation ?? { status: 200, body: CONFRONTATION };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;
      if (url.startsWith("/api/profiles"))
        return ok([{ id: 3, handle: "Me", platform: "chess.com" }]);
      if (url.startsWith("/api/games/1/annotations")) return ok(ANNOTATIONS);
      if (url.startsWith("/api/games/1")) return ok(GAME);
      if (url.includes("/confrontation"))
        return {
          ok: answer.status === 200,
          status: answer.status,
          json: async () => answer.body,
        } as Response;
      if (url.startsWith("/api/personal/1")) return ok(READING);
      throw new Error(`unexpected request: ${url}`);
    }),
  );
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
      expect(square!.style.backgroundColor).toBe(SEVERITY_SQUARE_TINT.inaccuracy);
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
