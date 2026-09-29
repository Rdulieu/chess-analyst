import { afterEach, describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StatsPage } from "../src/pages/StatsPage";
import type { StatsDamage, StatsReplay, StatsSummary } from "../src/types";

const bucket = (games: number, win: number, draw: number, loss: number): StatsSummary["total"] => ({
  games,
  win,
  draw,
  loss,
  winRate: games === 0 ? null : (win + 0.5 * draw) / games,
});

const SUMMARY: StatsSummary = {
  total: bucket(2, 1, 0, 1), // 50%
  byCategory: {
    bullet: bucket(0, 0, 0, 0),
    blitz: bucket(2, 1, 0, 1), // 50%
    rapid: bucket(0, 0, 0, 0),
    classical: bucket(0, 0, 0, 0),
    correspondence: bucket(0, 0, 0, 0),
  },
  bySide: {
    white: bucket(2, 1, 0, 1),
    black: bucket(0, 0, 0, 0),
  },
};

const REPLAY: StatsReplay = {
  signatures: {
    threshold: 3,
    rows: [{ signature: "RR vs Q", delta: 1, ...bucket(3, 1, 0, 2) }],
    below: { configurations: 4 },
    scope: { games: 2, withEndgame: 1, withoutEndgame: 1, unreadable: 0 },
  },
  materialBands: {
    rows: [
      { band: "−2..+2", ...bucket(3, 1, 0, 2), spread: { configurations: 3, lowest: 0, highest: 0.8 } },
    ],
    couples: 3,
    threshold: 3,
    equalBand: "−2..+2",
  },
  phaseResults: {
    rows: [
      { phase: "early", ...bucket(0, 0, 0, 0), share: 0 },
      { phase: "middlegame", ...bucket(1, 1, 0, 0), share: 50 },
      { phase: "endgame", ...bucket(1, 0, 0, 1), share: 50 },
    ],
    games: 2,
    filed: 2,
    unreadable: 0,
  },
};

const DAMAGE: StatsDamage = {
  phaseDamage: {
    rows: [
      { phase: "early", dominant: 0, reached: 0, meanShare: null, medianShare: null },
      { phase: "middlegame", dominant: 0, reached: 0, meanShare: null, medianShare: null },
      { phase: "endgame", dominant: 0, reached: 0, meanShare: null, medianShare: null },
    ],
    analysed: 0,
    games: 2,
    undamaged: 0,
  },
};

/** The current `Profile` the page is about — every scoped page takes one. */
const PROFILE = {
  id: 7,
  platform: "chesscom" as const,
  username: "Alice",
  createdAt: "",
  games: 2,
  analyzed: 0,
};

/**
 * `/stats` reads through **three** routes since US-32 slice 08, so the double
 * has to answer per route rather than hand the same object to every call — a
 * stub that answered one shape everywhere would hide the split it is here to
 * exercise. Each entry may be a body or a promise, which is what lets a test
 * hold one block in its skeleton while another lands.
 */
function stubRoutes(routes: {
  summary?: unknown | Promise<unknown>;
  replay?: unknown | Promise<unknown>;
  recaps?: unknown | Promise<unknown>;
  status?: (path: string) => number;
}) {
  const asked: string[] = [];
  const fetcher = vi.fn(async (path: string) => {
    asked.push(path);
    const which = path.includes("/replay") ? "replay" : path.includes("/recaps") ? "recaps" : "summary";
    const status = routes.status?.(path) ?? 200;
    const body = await routes[which];
    return { ok: status < 400, status, json: async () => body } as Response;
  });
  vi.stubGlobal("fetch", fetcher);
  return asked;
}

/** The whole page, answered at once — what most of these tests want. */
function stub(summary: StatsSummary) {
  return stubRoutes({ summary, replay: REPLAY, recaps: DAMAGE });
}

afterEach(() => vi.unstubAllGlobals());

describe("StatsPage", () => {
  it("renders the total, per-cadence and per-side breakdowns as one grouped table", async () => {
    stub(SUMMARY);
    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    const table = await screen.findByRole("table", { name: /résultats/i });

    // Total: games count and overall win rate, on its own group's row.
    const total = within(table).getByRole("rowgroup", { name: /^total$/i });
    expect(within(total).getByRole("row").textContent).toContain("2");
    expect(within(total).getByRole("row").textContent).toContain("50");

    // Per cadence: a played cadence shows its rate; an unplayed one shows 0 with no rate.
    const cadence = within(table).getByRole("rowgroup", { name: /cadence/i });
    expect(within(cadence).getByRole("row", { name: /blitz/i }).textContent).toContain("50");
    const rapid = within(cadence).getByRole("row", { name: /rapid/i });
    expect(rapid.textContent).toContain("0");
    expect(rapid.textContent).not.toContain("%");

    // Per side present, in the side group.
    const side = within(table).getByRole("rowgroup", { name: /côté|side/i });
    expect(within(side).getByRole("row", { name: /blancs/i })).toBeTruthy();
    expect(within(side).getByRole("row", { name: /noirs/i })).toBeTruthy();
  });

  it("wraps its table in its own scroll container, so a wide table never scrolls the page", async () => {
    stub(SUMMARY);
    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    const table = await screen.findByRole("table", { name: /résultats/i });
    expect(table.parentElement?.dataset.scroll).toBe("x");
  });

  it("keeps each figure in its own cell: games, tally and Win rate", async () => {
    stub(SUMMARY);
    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    const table = await screen.findByRole("table", { name: /résultats/i });
    const blitz = within(table).getByRole("row", { name: /blitz/i });
    const cells = within(blitz).getAllByRole("cell");

    expect(cells).toHaveLength(3);
    expect(cells[0].textContent).toMatch(/2 parties/i);
    expect(cells[1].textContent).toMatch(/1/); // the win/draw/loss tally
    expect(cells[2].textContent).toMatch(/50 %/);
  });

  it("shows only an invitation when there are no imported Games", async () => {
    const empty: StatsSummary = {
      total: bucket(0, 0, 0, 0),
      byCategory: {
        bullet: bucket(0, 0, 0, 0),
        blitz: bucket(0, 0, 0, 0),
        rapid: bucket(0, 0, 0, 0),
        classical: bucket(0, 0, 0, 0),
        correspondence: bucket(0, 0, 0, 0),
      },
      bySide: { white: bucket(0, 0, 0, 0), black: bucket(0, 0, 0, 0) },
    };
    stub(empty);
    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/aucune partie/i)).toBeTruthy();
    // No results table at all in the empty state.
    expect(screen.queryByRole("table", { name: /résultats/i })).toBeNull();
  });
});

describe("StatsPage — the three load outcomes stay apart", () => {
  const PROFILE = {
    id: 7,
    platform: "chesscom" as const,
    username: "Alice",
    createdAt: "",
    games: 0,
    analyzed: 0,
  };

  it("says the load failed and offers to retry, instead of reading as an empty history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as Response),
    );

    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByText(/aucune partie importée/i)).toBeNull();
    expect(screen.getByRole("button", { name: /réessayer/i })).toBeTruthy();
  });

  it("invites an import for a Profile that genuinely has no Game", async () => {
    stub({ ...SUMMARY, total: bucket(0, 0, 0, 0) });

    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/aucune partie/i)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("StatsPage — the Endgame configurations", () => {
  it("carries the corpus table under the results, scope and all", async () => {
    stub(SUMMARY);
    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    const table = await screen.findByRole("table", { name: /configurations de finale/i });
    const line = within(table).getByRole("row", { name: /RR vs Q/ });
    // Counts and rate together on the line, never a bare rate.
    expect(within(line).getByText("3 parties")).toBeTruthy();
    expect(within(line).getByText("33 %")).toBeTruthy();

    expect(screen.getByTestId("signature-scope").textContent).toContain("1");
    expect(screen.getByTestId("signature-below").textContent).toContain("4 configurations");
  });
});

describe("StatsPage — the material band table (US-32 slice 07)", () => {
  it("sits under the configurations it explains, with its mitigation written", async () => {
    stub(SUMMARY);
    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("table", { name: /win rate par bande de matériel/i })).toBeTruthy();
    expect(screen.getByTestId("material-bands-spread").textContent).toMatch(/ne prédit pas/);

    // The column is on the configuration table, and the founding case reads +1.
    const configurations = screen.getByRole("table", { name: /configurations de finale/i });
    expect(within(configurations).getByText("+1")).toBeTruthy();

    // The two blocks are in the order the page promises: configurations, then
    // the bands that read them — the band table never re-sorts the first.
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings.indexOf("Configurations de finale")).toBeLessThan(
      headings.findIndex((h) => /Déséquilibre matériel/.test(h ?? "")),
    );
  });
});

/**
 * US-32 slice 08: the page arrives in pieces. What these tests hold onto is not
 * the animation but the three things a piecewise page can get wrong — showing
 * nothing while it waits, asking for folds it will throw away, and letting one
 * failed block take the others with it.
 */
describe("StatsPage — the page arrives in pieces (US-32 slice 08)", () => {
  /** A promise this test decides when to settle: the wait, made observable. */
  function pending<T>() {
    let settle!: (value: T) => void;
    const promise = new Promise<T>((resolve) => (settle = resolve));
    return { promise, settle };
  }

  const page = () =>
    render(
      <MemoryRouter>
        <StatsPage profile={PROFILE} />
      </MemoryRouter>,
    );

  it("shows the results the moment they land, with a skeleton where each slow block will go", async () => {
    stubRoutes({ summary: SUMMARY, replay: pending().promise, recaps: pending().promise });
    page();

    // The point of the slice: the figures are on screen while the folds run.
    expect(await screen.findByRole("table", { name: /résultats/i })).toBeTruthy();

    // A skeleton per awaited block, each one naming what it is waiting for and
    // standing under the heading the finished table will carry.
    for (const id of [
      "signatures-heading",
      "material-bands-heading",
      "phase-results-heading",
      "phase-damage-heading",
    ]) {
      const skeleton = screen.getByTestId(`${id}-skeleton`);
      expect(skeleton.getAttribute("aria-busy")).toBe("true");
      // Named in words, not by the grey bars alone (ADR-0013).
      expect(within(skeleton).getByRole("status").textContent).toMatch(/calcul en cours/);
    }
  });

  it("does not lie about the volume, and keeps its ghost table in its own scroller", async () => {
    stubRoutes({ summary: SUMMARY, replay: pending().promise, recaps: pending().promise });
    page();

    const skeleton = await screen.findByTestId("phase-results-heading-skeleton");
    const ghost = skeleton.querySelector("table")!;
    // Three Phases in the finished table, three sketched rows — a shape, never
    // twenty ghost lines above a table that will hold three.
    expect(ghost.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(ghost.parentElement?.dataset.scroll).toBe("x");
  });

  it("lands the damage table without waiting for the replay group, and its observation after", async () => {
    const replay = pending<StatsReplay>();
    stubRoutes({ summary: SUMMARY, replay: replay.promise, recaps: DAMAGE });
    page();

    // The cheaper fold is asked for first and shows first: its block is out of
    // its skeleton while the three replay blocks are still in theirs.
    expect(await screen.findByText(/n'a été analysée/)).toBeTruthy();
    expect(screen.getByTestId("signatures-heading-skeleton")).toBeTruthy();
    expect(screen.queryByTestId("phase-damage-heading-skeleton")).toBeNull();

    replay.settle(REPLAY);
    expect(await screen.findByRole("table", { name: /configurations de finale/i })).toBeTruthy();
  });

  it("never asks for the two expensive folds when the history is empty", async () => {
    const asked = stubRoutes({
      summary: { ...SUMMARY, total: bucket(0, 0, 0, 0) },
      replay: REPLAY,
      recaps: DAMAGE,
    });
    page();

    expect(await screen.findByText(/aucune partie/i)).toBeTruthy();
    // The invitation is the whole answer; a fold over nothing is a request
    // asked in order to be thrown away, and no skeleton may outlive the page.
    expect(asked).toEqual(["/api/stats?profileId=7"]);
    expect(screen.queryByTestId("phase-damage-heading-skeleton")).toBeNull();
  });

  it("keeps a failed block from wiping the others, and offers that block its own retry", async () => {
    stubRoutes({
      summary: SUMMARY,
      replay: REPLAY,
      recaps: DAMAGE,
      status: (path) => (path.includes("/replay") ? 500 : 200),
    });
    page();

    // The replay group failed; the results and the damage table are untouched.
    const failure = await screen.findByRole("alert");
    expect(failure.textContent).toMatch(/configurations de finale/);
    expect(within(failure).getByRole("button", { name: /réessayer/i })).toBeTruthy();
    expect(screen.getByRole("table", { name: /résultats/i })).toBeTruthy();
    expect(await screen.findByText(/n'a été analysée/)).toBeTruthy();
  });

  it("releases the replay group even when the damage read fails before it", async () => {
    stubRoutes({
      summary: SUMMARY,
      replay: REPLAY,
      recaps: DAMAGE,
      status: (path) => (path.includes("/recaps") ? 500 : 200),
    });
    page();

    // A broken first fold must not strand the second behind a gate that never
    // opens: the gate releases when the damage read SETTLES, not when it wins.
    expect(await screen.findByRole("table", { name: /configurations de finale/i })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/dégâts par phase/);
  });

  it("costs a retry to its own block only, and never re-pays the PGN replay for it", async () => {
    // The damage read fails, then succeeds on the retry. The replay group has
    // already landed by then, and it must stay landed: a gate read live would
    // close behind it when the damage block goes back to `loading`.
    let recaps = 0;
    const asked = stubRoutes({
      summary: SUMMARY,
      replay: REPLAY,
      recaps: DAMAGE,
      status: (path) => (path.includes("/recaps") ? (recaps++ === 0 ? 500 : 200) : 200),
    });
    page();

    expect(await screen.findByRole("table", { name: /configurations de finale/i })).toBeTruthy();
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: /réessayer/i }));

    expect(await screen.findByText(/n'a été analysée/)).toBeTruthy();
    // Still there, never back to a skeleton — and asked for exactly once.
    expect(screen.getByRole("table", { name: /configurations de finale/i })).toBeTruthy();
    expect(asked.filter((path) => path.includes("/replay"))).toHaveLength(1);
  });
});
