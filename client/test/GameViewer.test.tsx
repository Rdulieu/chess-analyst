import { afterEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameViewer } from "../src/features/games/GameViewer";
import { OPERA_GAME } from "./fixtures";
import type { GameTime, MoveAnnotation } from "../src/types";
/**
 * The current-Move readout names this Move — number then notation since US-23
 * (F3), so a test that means "the readout is on this Move" says that rather than
 * spelling the label. What the label IS is pinned once, in its own test.
 */
function expectCurrentMove(san: string) {
  if (san === "Start") {
    expect(screen.getByLabelText("current move").textContent).toBe("Start");
    return;
  }
  const escaped = san.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  expect(screen.getByLabelText("current move").textContent).toMatch(
    new RegExp(`^\\d+[.\u2026]${escaped}$`),
  );
}


function stubAnnotations(plies: MoveAnnotation[], time: GameTime = NO_TIME) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ analyzed: true, plies, time }),
        }) as Response,
    ),
  );
}

/** A Game whose PGN declares no `[TimeControl]` — absent, which is what most of
 *  these fixtures are, and never a zero. */
const NO_TIME: GameTime = {
  timeControl: null,
  plies: [],
  absence: "not-recorded",
  precision: null,
  reading: null,
};

/** The annotations payload of a Game the engine has never seen: no ply, no
 *  recap — and a time block all the same (ADR-0029). */
function stubUnanalyzed(time: GameTime) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ analyzed: false, plies: [], regime: null, recap: null, time }),
        }) as Response,
    ),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  // The Review mode is remembered across Games *and* sessions, so it is also
  // remembered across tests unless each one starts from a blank slate.
  localStorage.clear();
});

describe("GameViewer", () => {
  /** "1. e4 e5" annotated so that e4 is a Blunder with a line to report. */
  const ANNOTATED = [
    { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: ["d2d4"], phase: "early", counted: null, chancesLost: null },
    { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: ["e7e5"], phase: "early", counted: null, chancesLost: null },
  ] satisfies MoveAnnotation[];

  const moveItems = () =>
    within(screen.getByRole("list", { name: "moves" })).getAllByRole("listitem");

  it("opens an analysed Game in Unaided: the Game is readable and the engine says nothing", async () => {
    stubAnnotations(ANNOTATED);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    // The move list is there — it is not an annotation — and the level control is
    // there to ask with. What the engine found is not.
    await screen.findByRole("radiogroup", { name: /niveau de revue/i });
    const items = moveItems();
    expect(items[0].textContent).not.toContain("??");
    expect(items[0].textContent).not.toContain("-4.0");
    expect(screen.queryByRole("region", { name: /relevé/i })).toBeNull();
  });

  it("offers ONE control with three exclusive levels, never two independent switches", async () => {
    stubAnnotations(ANNOTATED);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    const group = await screen.findByRole("radiogroup", { name: /niveau de revue/i });
    const levels = within(group).getAllByRole("radio");
    expect(levels).toHaveLength(3);
    expect(levels.filter((level) => (level as HTMLInputElement).checked)).toHaveLength(1);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("reveals the annotations at the intermediate level, and the record only at the detailed one", async () => {
    stubAnnotations(ANNOTATED);
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    await user.click(await screen.findByRole("radio", { name: /annoté/i }));

    expect(moveItems()[0].textContent).toContain("??");
    expect(moveItems()[0].textContent).toContain("-4.0");
    // Annotated is exactly what US-7/US-14 delivered: the record is the next level up.
    expect(screen.queryByRole("region", { name: /relevé/i })).toBeNull();

    await user.click(screen.getByRole("radio", { name: /détaillé/i }));

    expect(moveItems()[0].textContent).toContain("??");
    expect(screen.getByRole("region", { name: /relevé/i })).toBeTruthy();
  });

  /*
   * "remembers the level, so the next Game opens at it without being asked
   * again" stood here, and it was the withdrawn rule's own test. Its inversion
   * lives below, in the US-28 block, with the reason it was withdrawn — the
   * level was not only a display, it stamped the reading's provenance.
   */

  it("offers to re-analyse a Game that is ALREADY analysed, which this screen used not to", async () => {
    stubAnnotations(ANNOTATED);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    expect(
      await screen.findByRole("button", { name: /réanalyser cette partie/i }),
    ).toBeTruthy();
  });

  it("warns before overwriting an existing analysis, and cancelling starts nothing", async () => {
    stubAnnotations(ANNOTATED);
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    await user.click(await screen.findByRole("button", { name: /réanalyser cette partie/i }));
    const warning = screen.getByRole("alertdialog", { name: /confirmer la réanalyse/i });
    // It names the Game — deleting the wrong one's Evaluations by reflex is the risk.
    expect(warning.textContent).toContain("Paul Morphy");
    expect(warning.textContent).toMatch(/écrasée/i);

    await user.click(screen.getByRole("button", { name: /annuler/i }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    // The annotations are still on screen: nothing was destroyed.
    await user.click(screen.getByRole("radio", { name: /annoté/i }));
    expect(moveItems()[0].textContent).toContain("??");
  });

  it("sends the confirmation to the server, so a confirmed re-analysis actually opens a pass", async () => {
    const posts: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          posts.push(JSON.parse(opts.body as string));
          return { ok: true, status: 202, json: async () => ({ running: false, total: 2, done: 2, started: true }) } as Response;
        }
        if (url.startsWith("/api/analyze/status")) {
          return { ok: true, status: 200, json: async () => ({ running: false, total: 2, done: 2 }) } as Response;
        }
        return { ok: true, status: 200, json: async () => ({ analyzed: true, plies: ANNOTATED, recap: null, regime: null }) } as Response;
      }),
    );
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    await user.click(await screen.findByRole("button", { name: /réanalyser cette partie/i }));
    await user.click(screen.getByRole("button", { name: /^réanalyser$/i }));

    // A Game already analysed under the current regime is filtered out of an
    // ordinary pass, so without this flag the confirmation would warn about a
    // destruction the server then refuses to perform.
    await waitFor(() => expect(posts).toContainEqual({ gameIds: [OPERA_GAME.id], overwrite: true }));
  });

  it("keeps a single live region of ours: the pass progress, not the move readout", () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("no fetch expected"); }));

    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    // Stepping through moves answers the Player's own click and is already on
    // screen; announcing it competes for speech with a pass that runs for
    // minutes. It keeps its name and its text, it just stops being live.
    // react-chessboard emits its own unlabelled live region for drag-and-drop —
    // third-party, not ours to remove — so we assert on the ones we own.
    const ours = [...container.querySelectorAll('[role="status"]')].filter((el) =>
      el.hasAttribute("aria-label"),
    );
    expect(ours).toHaveLength(0); // no pass running here, and the move readout is no longer live
    expectCurrentMove("Start");
  });

  it("fetches annotations even for a not-yet-analyzed Game, but offers no level control", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    // **Reversed by US-15b, deliberately.** The request used to be gated on
    // `analyzed`, and the payload now also carries the time block — read from the
    // PGN, so it exists with no Evaluation behind it (ADR-0029). `rapid` has no
    // analysed Game at all, so the old gate hid the time on exactly the cadence
    // the feature exists for.
    expect(
      fetchMock.mock.calls
        .map(([url]) => url as string)
        .some((url) => url.startsWith(`/api/games/${OPERA_GAME.id}/annotations`)),
    ).toBe(true);
    // What has NOT changed: there is still nothing of the engine to reveal here,
    // so the level control offers nothing.
    expect(screen.queryByRole("radiogroup", { name: /niveau de revue/i })).toBeNull();
  });

  it("shows an explicit invitation and a per-Game 'Analyser' action for a not-yet-analyzed Game, alongside the board", () => {
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    expect(screen.getByText(/n'a pas encore été analysée/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /analyser cette partie/i })).toBeTruthy();
    // The board is never withheld: a Game is explorable as soon as it is imported.
    expect(screen.getByRole("list", { name: "moves" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
  });

  it("keeps the board free of annotations until the Game has been analyzed", () => {
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    expectCurrentMove("Start");
    expect(screen.queryByLabelText("evaluation")).toBeNull();
  });

  it("scopes 'Analyser cette partie' to only this Game and shows progress while the pass runs", async () => {
    // Two polls before completion, so the in-progress render isn't immediately
    // overwritten by completion in the same tick.
    let statusPolls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          expect(JSON.parse(opts.body as string)).toEqual({ gameIds: [OPERA_GAME.id] });
          return { ok: true, status: 202, json: async () => ({ running: true, total: 3, done: 0, games: 1 }) } as Response;
        }
        if (url.startsWith("/api/analyze/status")) {
          statusPolls += 1;
          const running = statusPolls < 2;
          return { ok: true, status: 200, json: async () => ({ running, total: 3, done: running ? 0 : 3, games: 1 }) } as Response;
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    await user.click(screen.getByRole("button", { name: /analyser cette partie/i }));

    expect((await screen.findByRole("status", { name: /progression de l'analyse/i })).textContent).toBe(
      "0/3 positions évaluées",
    );
  });

  it("moves THIS review to Annotated when a pass finishes on it, without changing the remembered level", async () => {
    let analyzed = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          return { ok: true, status: 202, json: async () => ({ running: true, total: 2, done: 0, games: 1 }) } as Response;
        }
        if (url.startsWith("/api/analyze/status")) {
          analyzed = true;
          return { ok: true, status: 200, json: async () => ({ running: false, total: 2, done: 2, games: 1 }) } as Response;
        }
        if (url.includes("/annotations")) {
          return { ok: true, status: 200, json: async () => ({ analyzed: true, plies: ANNOTATED }) } as Response;
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const user = userEvent.setup();
    // The parent re-renders the Game as analysed once the pass reports done —
    // which is what an unanalysed Game becoming reviewable looks like.
    const { rerender } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    await user.click(screen.getByRole("button", { name: /analyser cette partie/i }));
    await waitFor(() => expect(analyzed).toBe(true));
    rerender(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    // A finished pass that changed nothing on screen is indistinguishable from
    // one that did nothing: this review shows what was just computed.
    await waitFor(() =>
      expect(
        within(screen.getByRole("list", { name: "moves" })).getAllByRole("listitem")[0].textContent,
      ).toContain("??"),
    );
    // ...but the Player never asked for that on their *other* Games. Since
    // US-28 nothing could carry it there even if the pass tried: the next Game
    // opens Unaided, which the US-28 block below asserts directly.
  });

  it("notifies once the analysis pass completes, so the Game and its annotations can refresh", async () => {
    const onAnalyzed = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url.startsWith("/api/analyze?") && opts?.method === "POST") {
          return { ok: true, status: 202, json: async () => ({ running: true, total: 3, done: 0, games: 1 }) } as Response;
        }
        if (url.startsWith("/api/analyze/status")) {
          return { ok: true, status: 200, json: async () => ({ running: false, total: 3, done: 3, games: 1 }) } as Response;
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} onAnalyzed={onAnalyzed} />);

    await user.click(screen.getByRole("button", { name: /analyser cette partie/i }));

    await waitFor(() => expect(onAnalyzed).toHaveBeenCalledTimes(1));
  });
});

describe("GameViewer — game header", () => {
  function squareOrder(container: HTMLElement): string[] {
    return [...container.querySelectorAll("[data-square]")].map(
      (el) => el.getAttribute("data-square")!,
    );
  }

  it("names both players with their colour", () => {
    render(<GameViewer game={OPERA_GAME} />);

    const header = screen.getByRole("region", { name: /partie/i });
    expect(header.textContent).toContain("Paul Morphy");
    expect(header.textContent).toContain("Duke Karl / Count Isouard");
    expect(header.textContent).toMatch(/blancs/i);
    expect(header.textContent).toMatch(/noirs/i);
  });

  it("marks which of the two is the Player, in words and not by colour alone", () => {
    render(<GameViewer game={{ ...OPERA_GAME, playerColor: "black" }} />);

    const player = screen.getByRole("region", { name: /partie/i }).querySelector("[data-player]");
    expect(player?.textContent).toContain("Duke Karl / Count Isouard");
    expect(player?.textContent).toMatch(/vous/i);
  });

  it("states the result from the Player's side rather than as a symmetric score", () => {
    const { rerender } = render(<GameViewer game={{ ...OPERA_GAME, result: "win" }} />);
    expect(screen.getByRole("region", { name: /partie/i }).textContent).toMatch(/victoire/i);

    rerender(<GameViewer game={{ ...OPERA_GAME, result: "loss" }} />);
    expect(screen.getByRole("region", { name: /partie/i }).textContent).toMatch(/défaite/i);

    rerender(<GameViewer game={{ ...OPERA_GAME, result: "draw" }} />);
    expect(screen.getByRole("region", { name: /partie/i }).textContent).toMatch(/nulle/i);
  });

  it("shows the date, the time control category and the Opening", () => {
    render(
      <GameViewer
        game={{
          ...OPERA_GAME,
          date: "2026-06-04",
          timeControlCategory: "blitz",
          eco: "B22",
          openingName: "Sicilian Defense: Alapin Variation",
        }}
      />,
    );

    const header = screen.getByRole("region", { name: /partie/i }).textContent!;
    expect(header).toContain("2026-06-04");
    expect(header).toMatch(/blitz/i);
    expect(header).toContain("B22");
    expect(header).toContain("Sicilian Defense: Alapin Variation");
  });

  it("says an unclassified Game has no Opening rather than leaving it blank", () => {
    render(<GameViewer game={{ ...OPERA_GAME, eco: null, openingName: null }} />);

    expect(screen.getByRole("region", { name: /partie/i }).textContent).toMatch(/non classée/i);
  });

  it("orients the board to the side the Player played", () => {
    const { container, rerender } = render(
      <GameViewer game={{ ...OPERA_GAME, playerColor: "white" }} />,
    );
    expect(squareOrder(container)[0]).toBe("a8");

    rerender(<GameViewer game={{ ...OPERA_GAME, playerColor: "black" }} />);
    expect(squareOrder(container)[0]).toBe("h1");
  });

  it("shows the header for a Game that has not been analyzed yet", () => {
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    expect(screen.getByRole("region", { name: /partie/i }).textContent).toContain("Paul Morphy");
  });

  it("leaves the header untouched while stepping through the Moves", async () => {
    const user = userEvent.setup();
    render(<GameViewer game={OPERA_GAME} />);

    const before = screen.getByRole("region", { name: /partie/i }).textContent;
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByRole("region", { name: /partie/i }).textContent).toBe(before);
  });

});

describe("GameViewer — the level of THIS review, and of no other (US-28)", () => {
  const seen = () => JSON.parse(localStorage.getItem("chess-analyst.engine-seen") ?? "[]");

  it("opens Unaided whatever level a previous session left behind", async () => {
    // The withdrawn rule, inverted. `Review mode` used to be remembered across
    // Games and sessions, and this exact store is what reopened a freshly
    // analysed Game in Détaillé — deciding in the Player's place.
    localStorage.setItem("chess-analyst.review-mode", "detailed");
    stubAnnotations(ANNOTATED_FOR_PROVENANCE);

    render(<GameViewer game={{ ...OPERA_GAME, id: 42, analyzed: true }} />);

    const group = await screen.findByRole("radiogroup", { name: /niveau de revue/i });
    expect(within(group).getByRole("radio", { checked: true })).toBe(
      within(group).getByRole("radio", { name: /sans aide/i }),
    );
  });

  it("does not carry the chosen level to the next Game", async () => {
    stubAnnotations(ANNOTATED_FOR_PROVENANCE);
    const user = userEvent.setup();
    const { unmount } = render(<GameViewer game={{ ...OPERA_GAME, id: 42, analyzed: true }} />);
    await user.click(await screen.findByRole("radio", { name: /détaillé/i }));
    unmount();

    render(<GameViewer game={{ ...OPERA_GAME, id: 43, analyzed: true }} />);

    const group = await screen.findByRole("radiogroup", { name: /niveau de revue/i });
    expect(within(group).getByRole("radio", { checked: true })).toBe(
      within(group).getByRole("radio", { name: /sans aide/i }),
    );
  });

  it("records no provenance on opening, however the level was left", async () => {
    // The invariant this slice exists to pin. A level above Unaided on an
    // analysed Game is what marks a reading as informed, and it used to be
    // reached at MOUNT, before the Player had read a thing — labelling an
    // honestly blind reading as informed, the one direction `engineSeen`
    // warns is worse than useless.
    localStorage.setItem("chess-analyst.review-mode", "detailed");
    stubAnnotations(ANNOTATED_FOR_PROVENANCE);

    render(<GameViewer game={{ ...OPERA_GAME, id: 42, analyzed: true }} />);
    await screen.findByRole("radiogroup", { name: /niveau de revue/i });

    expect(seen()).toEqual([]);
  });
});

describe("GameViewer — recording that the engine was shown", () => {
  const seen = () => JSON.parse(localStorage.getItem("chess-analyst.engine-seen") ?? "[]");

  it("records the Game once its annotations are actually on screen", async () => {
    stubAnnotations(ANNOTATED_FOR_PROVENANCE);
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, id: 42, analyzed: true }} />);

    await user.click(await screen.findByRole("radio", { name: /annoté/i }));

    // The provenance of a future `Personal analysis` (US-16a): what was DISPLAYED,
    // recorded by the screen that displayed it.
    await waitFor(() => expect(seen()).toEqual([42]));
  });

  it("records nothing while the engine is saying nothing — Unaided shows no finding", async () => {
    stubAnnotations(ANNOTATED_FOR_PROVENANCE);
    render(<GameViewer game={{ ...OPERA_GAME, id: 42, analyzed: true }} />);

    await screen.findByRole("radiogroup", { name: /niveau de revue/i });

    expect(seen()).toEqual([]);
  });

  it("records nothing on a Game with no analysis to show, whatever the remembered level", async () => {
    localStorage.setItem("chess-analyst.review-mode", "detailed");
    stubAnnotations([]);
    render(<GameViewer game={{ ...OPERA_GAME, id: 42, analyzed: false }} />);

    await screen.findByText(/pas encore été analysée/i);

    // A level is a willingness to be shown; an unanalysed Game has nothing to
    // show. Marking it seen would label an honestly blind reading as informed.
    expect(seen()).toEqual([]);
  });
});

/** "1. e4 e5" annotated, for the provenance tests above. */
const ANNOTATED_FOR_PROVENANCE = [
  { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: ["d2d4"], phase: "early", counted: null, chancesLost: null },
  { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: ["e7e5"], phase: "early", counted: null, chancesLost: null },
] satisfies MoveAnnotation[];

describe("GameViewer — Analyse steps from the keyboard (US-23, D6)", () => {
  it("announces the arrows, and no verdict command — it has none", async () => {
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    const notice = await screen.findByText(/pour changer de coup/i);
    expect(notice.textContent).not.toMatch(/verdict|moment clé/i);

    // And they work: the board follows the arrow.
    await user.keyboard("{ArrowRight}");
    expectCurrentMove("e4");
  });

  it("leaves the arrows to a focused radio group — the Review mode keeps its own", async () => {
    // Confirmed with the requester as the intended behaviour, not a defect: the
    // group keeps its native arrows, and the control does not hand focus back
    // after a choice. Taking them away would break a convention assistive
    // technology takes for granted.
    const user = userEvent.setup();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    const annotated = await screen.findByRole("radio", { name: /annoté/i });
    await user.click(annotated);

    /* `fireEvent`, not `user.keyboard`, and for a reason worth recording:
       user-event runs its own radio-group walk on an arrow and that helper throws
       inside jsdom (`Cannot read properties of undefined (reading 'escape')`).
       That is the driver, not the app — and the real keystroke on a real radio is
       the Feature Path's job. What is testable here is that the board declines a
       keystroke whose target is a radio. */
    fireEvent.keyDown(annotated, { key: "ArrowRight" });

    // The Move did not change: the keystroke was the group's, not the board's.
    expectCurrentMove("Start");

    // And off the group, the same key is the board's again.
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expectCurrentMove("e4");
  });
});

describe("GameViewer — one board, one author (US-23, ADR-0022)", () => {
  const squareOf = (container: HTMLElement, square: string) =>
    container
      .querySelector<HTMLElement>(`[data-square="${square}"] > div`)
      ?.style.backgroundColor ?? "";

  it("keeps the ENGINE's tint on the square, and none of the Player's marks", async () => {
    // The counterpart of the reading route's guarantee. A square has neither a
    // column nor a title, only a colour, so it cannot hold two authors — and this
    // screen's author is the engine.
    const user = userEvent.setup();
    // Annotations STUBBED, and the level ASKED for. Neither was here before, and
    // between them they are why the tint assertion below now runs at all: with
    // no annotations the square never had a tint, so the check was passing on an
    // empty screen. A check that cannot fail has not passed.
    stubAnnotations(ANNOTATED_FOR_PROVENANCE);
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    await user.click(await screen.findByRole("radio", { name: /annoté/i }));
    await user.click(await screen.findByRole("button", { name: "Next" }));

    // Whatever tint is on the square, it is one of the engine's own tokens.
    const tint = squareOf(container, "e4");
    expect(tint).toBeTruthy();
    if (tint) expect(tint).toMatch(/^var\(--square-(inaccuracy|mistake|blunder)\)$/);
    // And nothing of the Player's reading is drawn on this diagram.
    expect(container.querySelector('[data-part="move-marks"]')).toBeNull();
    for (const own of ["sound", "good"]) {
      expect(container.querySelectorAll(`[style*='--square-${own}']`)).toHaveLength(0);
    }
  });

  it("paints no square at Unaided — there is nothing of the engine to show", async () => {
    const user = userEvent.setup();
    // Unaided is where every review now opens (US-28) — nothing to set.
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);

    await user.click(await screen.findByRole("button", { name: "Next" }));

    for (const severity of ["inaccuracy", "mistake", "blunder"]) {
      expect(container.querySelectorAll(`[style*='--square-${severity}']`)).toHaveLength(0);
    }
  });
});

/**
 * The exact `Time control`, on screen beside the category (US-15b, slice 01).
 * The category confuses a 3+2 with a 5+0; naming the cadence is what separates
 * them — and it must not *replace* the category, which says something else.
 */
describe("GameViewer — the exact Time control", () => {
  it("names the cadence beside the category, not instead of it", async () => {
    stubUnanalyzed({ ...NO_TIME, timeControl: { kind: "realtime", initialCs: 18_000, incrementCs: 200 } });

    render(<GameViewer game={{ ...OPERA_GAME, timeControlCategory: "blitz" }} />);

    const header = await screen.findByRole("region", { name: "partie" });
    await waitFor(() => expect(header.textContent).toContain("3+2"));
    // Both, because they answer different questions.
    expect(header.textContent).toContain("blitz");
  });

  it("names the days per move of a correspondence Game", async () => {
    stubUnanalyzed({ ...NO_TIME, timeControl: { kind: "correspondence", daysPerMove: 2 }, absence: "not-applicable" });

    render(
      <GameViewer game={{ ...OPERA_GAME, timeControlCategory: "correspondence" }} />,
    );

    const header = await screen.findByRole("region", { name: "partie" });
    await waitFor(() => expect(header.textContent).toContain("2 jours par coup"));
  });

  it("says the cadence is unknown in words when the PGN declares none", async () => {
    stubUnanalyzed(NO_TIME);

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    const header = await screen.findByRole("region", { name: "partie" });
    // Never a blank and never a `0`: an absent cadence is stated as absent.
    await waitFor(() => expect(header.textContent).toContain("cadence inconnue"));
  });

  it("asks for the annotations even on a Game the engine has never seen", async () => {
    // The structural assertion of the story: `rapid` has no analysed Game at
    // all, so a fetch gated on `analyzed` would leave that cadence blank.
    stubUnanalyzed({ ...NO_TIME, timeControl: { kind: "realtime", initialCs: 60_000, incrementCs: 0 } });

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    const header = await screen.findByRole("region", { name: "partie" });
    await waitFor(() => expect(header.textContent).toContain("10+0"));
  });
});

/**
 * The time per Move — **as a drawing plus one exact line, never as two numbers
 * per row of the move list.**
 *
 * It was built into the list first, and that made the list unreadable: a move
 * list names Moves, and the figures competed with the notation. The requester
 * said so on 2026-09-09 and the list went back to bare notation. What replaced it
 * gives something a column could not: the **shape** of a Game's time, with the
 * exact pair for the Move being read stated beside it.
 */
describe("GameViewer — the time per Move", () => {
  /** "1. e4 e5" on a 3+2, at the tenth precision chess.com writes. */
  const TIMED: GameTime = {
    timeControl: { kind: "realtime", initialCs: 18_000, incrementCs: 200 },
    plies: [
      { ply: 0, clockCs: null, spentCs: null, shareOfRemaining: null },
      { ply: 1, clockCs: 18_000, spentCs: 200, shareOfRemaining: 1.1 },
      { ply: 2, clockCs: 17_850, spentCs: 350, shareOfRemaining: 1.9 },
    ],
    absence: null,
    precision: "tenths",
    reading: null,
  };

  const moveItems = () =>
    within(screen.getByRole("list", { name: "moves" })).getAllByRole("listitem");

  it("keeps the move list to bare notation — no time on any row", async () => {
    stubUnanalyzed(TIMED);

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    await screen.findByText(/temps par coup/i);
    // The reversal itself, asserted: the list carries the Move and nothing about
    // time. This is what the requester asked for.
    for (const item of moveItems()) {
      expect(item.textContent).not.toMatch(/\ds\b|\d,\d s| s$/);
    }
    expect(document.querySelector('[data-part="move-time"]')).toBeNull();
  });

  it("draws the time per Move, saying which half is whose", async () => {
    stubUnanalyzed(TIMED);

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    // The label is the only part of the drawing a reader gets, so it must say
    // what the drawing does — including that the two halves are two sides.
    const label = await screen.findByText(/temps par coup/i);
    expect(label.textContent).toMatch(/vous en haut/i);
    expect(label.textContent).toMatch(/adversaire en bas/i);
    expect(document.querySelector('[data-part="time-graph"] svg')).toBeTruthy();
  });

  it("states the reviewed Move's own two figures, in words", async () => {
    stubUnanalyzed(TIMED);

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    // Navigation starts at ply 0, which is nobody's Move; step to the first.
    const line = await screen.findByText(/rien à afficher ici/i);
    expect(line).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      const now = document.querySelector('[data-part="current-move-time"]');
      // 2 s of thought, 3 min left — the figures that used to sit on the row.
      expect(now?.textContent).toContain("2,0 s");
      expect(now?.textContent).toContain("3 min 0,0 s");
    });
  });

  it("says what share of the clock the Move cost", async () => {
    // Asked for on 2026-09-09. "12 s" is a shrug on a full clock and a
    // catastrophe on 20 s left; the share is what tells the two apart.
    stubUnanalyzed({
      ...TIMED,
      plies: [
        { ply: 0, clockCs: null, spentCs: null, shareOfRemaining: null },
        { ply: 1, clockCs: 12_000, spentCs: 6_000, shareOfRemaining: 33.333 },
      ],
    });

    render(<GameViewer game={{ ...OPERA_GAME }} />);
    await screen.findByText(/temps par coup/i);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      const now = document.querySelector('[data-part="current-move-time"]');
      // A whole number above 10 %: 33 vs 34 is noise, and the decimal would
      // claim a distinction the reader cannot use.
      expect(now?.textContent).toContain("33 %");
      expect(now?.textContent).toMatch(/de ce qu'il vous restait/);
    });
  });

  it("keeps a decimal on a small share, where the distinction is real", async () => {
    stubUnanalyzed({
      ...TIMED,
      plies: [
        { ply: 0, clockCs: null, spentCs: null, shareOfRemaining: null },
        { ply: 1, clockCs: 17_980, spentCs: 20, shareOfRemaining: 0.333 },
      ],
    });

    render(<GameViewer game={{ ...OPERA_GAME }} />);
    await screen.findByText(/temps par coup/i);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      const now = document.querySelector('[data-part="current-move-time"]');
      expect(now?.textContent).toContain("0,3 %");
    });
  });

  it("says nothing about a share it does not have, rather than 0 %", async () => {
    stubUnanalyzed({
      ...TIMED,
      plies: [
        { ply: 0, clockCs: null, spentCs: null, shareOfRemaining: null },
        { ply: 1, clockCs: 18_000, spentCs: null, shareOfRemaining: null },
      ],
    });

    render(<GameViewer game={{ ...OPERA_GAME }} />);
    await screen.findByText(/temps par coup/i);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      const now = document.querySelector('[data-part="current-move-time"]');
      expect(now?.textContent).not.toContain("%");
    });
  });

  it("draws the time graph BELOW the analysis curve", async () => {
    // The requester's layout call, 2026-09-09: the analysis graph comes first.
    // Its own annotated fixture: `ANNOTATED` belongs to another describe block.
    const annotated = [
      { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: [], phase: "early", counted: null, chancesLost: null },
      { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 5, severity: "blunder", bestLine: [], phase: "early", counted: null, chancesLost: null },
    ] satisfies MoveAnnotation[];
    stubAnnotations(annotated, TIMED);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await screen.findByRole("radiogroup", { name: /niveau de revue/i });
    await userEvent.click(screen.getByRole("radio", { name: /annoté/i }));

    await waitFor(() => expect(document.querySelector('[data-part="curve"]')).toBeTruthy());
    const labels = [...document.querySelectorAll('[data-part="graph-label"]')].map(
      (el) => el.textContent ?? "",
    );
    const curve = labels.findIndex((t) => /avantage au fil/i.test(t));
    const timeAt = labels.findIndex((t) => /temps par coup/i.test(t));
    expect(curve).toBeGreaterThanOrEqual(0);
    expect(timeAt).toBeGreaterThan(curve);
  });

  it("follows the Player onto the opponent's Move too", async () => {
    // Both sides are measured — who suffered the pressure and who inflicted it
    // is the question (kept on the requester's decision, 2026-09-09).
    stubUnanalyzed(TIMED);

    render(<GameViewer game={{ ...OPERA_GAME }} />);
    await screen.findByText(/temps par coup/i);

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      const now = document.querySelector('[data-part="current-move-time"]');
      expect(now?.textContent).toContain("3,5 s");
    });
  });

  it("prints a whole second, with no decimal, where the source rounds to the second", async () => {
    stubUnanalyzed({ ...TIMED, precision: "seconds" });

    render(<GameViewer game={{ ...OPERA_GAME }} />);
    await screen.findByText(/temps par coup/i);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      const now = document.querySelector('[data-part="current-move-time"]');
      expect(now?.textContent).toContain("2 s");
      // A tenth here would claim a precision the PGN never carried (±1 s).
      expect(now?.textContent).not.toContain("2,0 s");
    });
  });

  it("says « sans objet » on a correspondence Game, and draws nothing", async () => {
    stubUnanalyzed({
      timeControl: { kind: "correspondence", daysPerMove: 2 },
      plies: [],
      absence: "not-applicable",
      precision: null,
      reading: null,
    });

    render(<GameViewer game={{ ...OPERA_GAME, timeControlCategory: "correspondence" }} />);

    const said = await screen.findAllByText(/sans objet/i);
    expect(said.length).toBeGreaterThan(0);
    // No drawing, and no `0` standing in for a figure the app does not have.
    expect(document.querySelector('[data-part="time-graph"]')).toBeNull();
  });

  it("distinguishes a clock never recorded from one that does not apply", async () => {
    stubUnanalyzed({
      timeControl: { kind: "realtime", initialCs: 60_000, incrementCs: 0 },
      plies: [],
      absence: "not-recorded",
      precision: null,
      reading: null,
    });

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    await screen.findByText(/pas d'horloge enregistrée/i);
    expect(screen.queryByText(/sans objet/i)).toBeNull();
    expect(document.querySelector('[data-part="time-graph"]')).toBeNull();
  });

  it("draws and states the time on a Game the engine has never seen", async () => {
    // The structural assertion: `rapid` has zero analysed Games, and the drawing
    // is outside the `annotations` guard for exactly that reason.
    stubUnanalyzed(TIMED);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    await screen.findByText(/temps par coup/i);
    expect(document.querySelector('[data-part="time-graph"] svg')).toBeTruthy();
    // …while the engine's own record is genuinely absent.
    expect(screen.queryByRole("radiogroup", { name: /niveau de revue/i })).toBeNull();
  });

  it("claims no cadence while the block is still loading", async () => {
    // "cadence inconnue" is a CLAIM, and it is false before the answer arrives.
    // Found by the slice-01 Feature Path, which read the header mid-fetch.
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    const header = await screen.findByRole("region", { name: "partie" });
    expect(header.textContent).not.toContain("cadence inconnue");
  });
});

/**
 * The Game's own reading of the time (US-15b, slice 03), in the recap panel.
 * Every figure is a fold over the column beside it (ADR-0017) — the Player must
 * be able to recoup the panel by hand, which is the EPIC's audit requirement.
 */
describe("GameViewer — the Game's time reading", () => {
  const READ: GameTime = {
    timeControl: { kind: "realtime", initialCs: 18_000, incrementCs: 200 },
    plies: [
      { ply: 0, clockCs: null, spentCs: null, shareOfRemaining: null },
      { ply: 1, clockCs: 18_000, spentCs: 200, shareOfRemaining: 1.1 },
      { ply: 2, clockCs: 17_850, spentCs: 350, shareOfRemaining: 1.9 },
    ],
    absence: null,
    precision: "tenths",
    reading: {
      moves: 1,
      measuredMoves: 1,
      lastClockCs: 4_653,
      totalSpentCs: 200,
      lowClockCs: 1_800,
      underLowClock: 0,
      longest: [{ ply: 1, spentCs: 200, shareOfRemaining: 1.1 }],
      costliestShare: [{ ply: 1, spentCs: 200, shareOfRemaining: 1.1 }],
      timeControl: { kind: "realtime", initialCs: 18_000, incrementCs: 200 },
    },
  };

  it("states the total spent, the low-clock count and the longest Moves", async () => {
    stubUnanalyzed(READ);

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    const panel = await screen.findByRole("region", { name: /temps/i });
    expect(panel.textContent).toContain("2,0 s");
    expect(panel.textContent).toMatch(/1 coup/);
  });

  it("serves BOTH rankings, and each Move with its share", async () => {
    // Asked for on 2026-09-09. The two lists answer different questions and are
    // not the same list: a long think early and a short one on a nearly-flagged
    // clock are two different faults.
    stubUnanalyzed({
      ...READ,
      reading: {
        ...READ.reading!,
        // 43,3 s out of 120 s — the long think.
        longest: [{ ply: 39, spentCs: 4_330, shareOfRemaining: 36.1 }],
        // 1,1 s out of 3 s — the panic, invisible in a ranking by seconds.
        costliestShare: [{ ply: 75, spentCs: 110, shareOfRemaining: 36.7 }],
      },
    });

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    const panel = await screen.findByRole("region", { name: /temps/i });
    const bySeconds = panel.querySelector('[data-part="longest"]')?.textContent ?? "";
    const byShare = panel.querySelector('[data-part="costliest-share"]')?.textContent ?? "";

    // Each list carries seconds AND share, in the same wording, so what a reader
    // compares between them is the ordering and nothing else.
    expect(bySeconds).toContain("43,3 s");
    expect(bySeconds).toContain("36 %");
    expect(byShare).toContain("1,1 s");
    expect(byShare).toContain("37 %");
    // And they are genuinely two different Moves here.
    expect(bySeconds).toContain("20.");
    expect(byShare).toContain("38.");
  });

  it("prints a Move's seconds alone when its share is unknown, never 0 %", async () => {
    stubUnanalyzed({
      ...READ,
      reading: {
        ...READ.reading!,
        longest: [{ ply: 1, spentCs: 200, shareOfRemaining: null }],
        costliestShare: [],
      },
    });

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    const panel = await screen.findByRole("region", { name: /temps/i });
    const line = panel.querySelector('[data-part="longest"]')?.textContent ?? "";
    expect(line).toContain("2,0 s");
    expect(line).not.toContain("%");
  });

  it("names the low-clock mark it counted against, so the Player can count the same Moves", async () => {
    stubUnanalyzed(READ);

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    const panel = await screen.findByRole("region", { name: /temps/i });
    // 18 s here — a tenth of the 3-minute budget. Stated, never hidden: a figure
    // the Player cannot recount is a figure they have to believe.
    expect(panel.textContent).toContain("18 s");
  });

  it("is there on a Game the engine has never seen, where the analysis recap is not", async () => {
    stubUnanalyzed(READ);

    render(<GameViewer game={{ ...OPERA_GAME, analyzed: false }} />);

    await screen.findByRole("region", { name: /temps/i });
    // The analysis recap is a different panel and is genuinely absent here.
    expect(screen.queryByRole("region", { name: /apporte à l'analyse/i })).toBeNull();
  });

  it("says « sans objet » on a correspondence Game rather than a reading at zero", async () => {
    stubUnanalyzed({
      timeControl: { kind: "correspondence", daysPerMove: 2 },
      plies: [],
      absence: "not-applicable",
      precision: null,
      reading: null,
    });

    render(<GameViewer game={{ ...OPERA_GAME, timeControlCategory: "correspondence" }} />);

    // **Reversed by this story's code review.** The panel used to vanish, which
    // left the Player unable to tell "this Game has nothing to say about time"
    // from "this screen is broken". It now ANSWERS — with "sans objet", and
    // still with no reading at zero anywhere.
    const panel = await screen.findByRole("region", { name: /temps/i });
    expect(panel.textContent).toMatch(/sans objet/i);
    expect(panel.textContent).not.toMatch(/0 s/);
  });
});

/**
 * The two facts the review found stored-but-unread and summed-as-zero. Both are
 * about the same discipline: the app never prints a figure it does not have.
 */
describe("GameViewer — what the reading refuses to invent", () => {
  const base: GameTime = {
    timeControl: { kind: "realtime", initialCs: 18_000, incrementCs: 200 },
    plies: [
      { ply: 0, clockCs: null, spentCs: null, shareOfRemaining: null },
      { ply: 1, clockCs: 18_000, spentCs: 200, shareOfRemaining: 1.1 },
    ],
    absence: null,
    precision: "tenths",
    reading: {
      moves: 4,
      measuredMoves: 4,
      lastClockCs: null,
      totalSpentCs: 200,
      lowClockCs: 1_800,
      underLowClock: 0,
      longest: [],
      costliestShare: [],
      timeControl: { kind: "realtime", initialCs: 18_000, incrementCs: 200 },
    },
  };

  it("says the total covers fewer Moves when some carry no figure", async () => {
    stubUnanalyzed({ ...base, reading: { ...base.reading!, moves: 4, measuredMoves: 3 } });

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    const panel = await screen.findByRole("region", { name: /temps/i });
    // A total quietly covering fewer Moves than the count beside it is a figure
    // the Player cannot check — and an absence folded in as `0` is what a later
    // aggregate would average.
    await waitFor(() => expect(panel.textContent).toMatch(/dont l'horloge est connue/));
  });

  it("says nothing about a gap when there is none", async () => {
    stubUnanalyzed(base);

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    const panel = await screen.findByRole("region", { name: /temps/i });
    expect(panel.textContent).not.toMatch(/dont l'horloge est connue/);
  });

  it("states the Clock of the side that never played the last Move", async () => {
    stubUnanalyzed({ ...base, reading: { ...base.reading!, lastClockCs: 4_653 } });

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    const panel = await screen.findByRole("region", { name: /temps/i });
    // A fact about the Game, belonging to no Move — which is why it appears here
    // and nowhere in the column.
    await waitFor(() => expect(panel.textContent).toContain("46,5 s"));
  });

  it("says « sans objet » for it on a mate or a chess.com Game, never a blank", async () => {
    stubUnanalyzed(base);

    render(<GameViewer game={{ ...OPERA_GAME }} />);

    const panel = await screen.findByRole("region", { name: /temps/i });
    await waitFor(() => expect(panel.textContent).toMatch(/sans objet/));
  });

  it("answers with a panel on a correspondence Game rather than going silent", async () => {
    stubUnanalyzed({
      timeControl: { kind: "correspondence", daysPerMove: 2 },
      plies: [],
      absence: "not-applicable",
      precision: null,
      reading: null,
    });

    render(<GameViewer game={{ ...OPERA_GAME, timeControlCategory: "correspondence" }} />);

    // A panel that simply vanishes leaves the Player unable to tell "nothing to
    // say about time" from "this screen is broken".
    const panel = await screen.findByRole("region", { name: /temps/i });
    expect(panel.textContent).toMatch(/sans objet/i);
  });
});
