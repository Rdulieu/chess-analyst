import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameViewer } from "../src/features/games/GameViewer";
import { OPERA_GAME } from "./fixtures";
import { OPPORTUNITY_TERM } from "../src/chess/opportunity";
import type { GameRecap, GameTime, MoveAnnotation } from "../src/types";

/**
 * **The `Opportunity` on the `Analyse` page — and above all, where it must NOT
 * be** (US-30, slice 05).
 *
 * The heart of the ticket is a prohibition, not a display: at `unaided` nothing
 * of the opponent-side measurement may be rendered — no text, no glyph, no
 * attribute, no class, no datum in the DOM. An information made invisible in CSS
 * is still a leak, so these tests read the **markup**, not the screen.
 *
 * Every assertion below is anchored on the payload the component was handed: the
 * test never supplies itself the value it checks.
 */

const NO_TIME: GameTime = {
  timeControl: null,
  plies: [],
  absence: "not-recorded",
  precision: null,
  reading: null,
};

/**
 * Two plies of the Opera Game. The Player is White, so **ply 2** is the
 * opponent's — and that is the one carrying the `Opportunity`. Ply 1 carries the
 * Player's own `blunder`, which is what makes the regression check below mean
 * something: the two subjects are on screen at once, and only one of them is
 * allowed to appear at `unaided`.
 */
const PLIES = [
  { ply: 0, whiteEval: { cp: 0, mate: null }, whiteWinChances: 50, severity: null, bestLine: ["d2d4"], phase: "early", counted: null, chancesLost: null, opportunity: null },
  { ply: 1, whiteEval: { cp: -400, mate: null }, whiteWinChances: 20, severity: "blunder", bestLine: ["e7e5"], phase: "early", counted: null, chancesLost: 30, opportunity: null },
  { ply: 2, whiteEval: { cp: 100, mate: null }, whiteWinChances: 60, severity: null, bestLine: ["g1f3"], phase: "early", counted: null, chancesLost: null, opportunity: { severity: "blunder" } },
] satisfies MoveAnnotation[];

const RECAP: GameRecap = {
  playerMoves: 1,
  countedMoves: 1,
  excluded: { forced: 0, decided: 0 },
  flaggedMoves: 1,
  countedErrors: 1,
  flaggedUncounted: { forced: 0, decided: 0 },
  chancesLost: 30,
  flaggedLoss: 30,
  drift: 0,
  opportunities: { total: 3, bySeverity: { inaccuracy: 1, mistake: 0, blunder: 2 } },
  regime: { depth: 16, lines: 2 },
};

function stub() {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        ({
          ok: true,
          status: 200,
          json: async () => ({ analyzed: true, plies: PLIES, recap: RECAP, time: NO_TIME }),
        }) as Response,
    ),
  );
}

async function chooseLevel(label: RegExp) {
  const group = await screen.findByRole("radiogroup", { name: /niveau de revue/i });
  await userEvent.click(within(group).getByRole("radio", { name: label }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("Analyse — at Unaided, the opponent-side measurement is NOT IN THE DOM", () => {
  it("renders no part, no attribute and no word of the Opportunity, on a payload that carries three", async () => {
    stub();
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await screen.findByRole("radiogroup", { name: /niveau de revue/i });

    // The payload is not empty — the leak has something to leak. Anchored on the
    // input rather than on a belief about it.
    expect(PLIES.some((ply) => ply.opportunity !== null)).toBe(true);
    expect(RECAP.opportunities.total).toBeGreaterThan(0);

    // …and none of it reaches the markup. Not the hook, not the attribute, not
    // the accessible name, not the word. `innerHTML` rather than `textContent`
    // on purpose: an attribute nobody displays is still a datum in the DOM, and
    // a rule that hides it is CSS the driver can turn off.
    expect(container.querySelector('[data-part="opportunity"]')).toBeNull();
    expect(container.querySelector("[data-opportunity]")).toBeNull();
    expect(container.innerHTML).not.toContain(OPPORTUNITY_TERM);
    expect(container.innerHTML).not.toContain("opportunit");
  });

  it("does not leak the count through the recap either — the recap is absent at Unaided", async () => {
    stub();
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await screen.findByRole("radiogroup", { name: /niveau de revue/i });

    expect(screen.queryByRole("region", { name: /ce que cette partie apporte/i })).toBeNull();
    // The figure itself, spelled out: the total the payload carries must not be
    // findable anywhere in the markup.
    expect(container.innerHTML).not.toContain(`${RECAP.opportunities.total} ${OPPORTUNITY_TERM}`);
  });

  it("comes BACK to silence when the Player returns to Unaided", async () => {
    stub();
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await chooseLevel(/annoté/i);
    await waitFor(() =>
      expect(container.querySelector('[data-part="opportunity"]')).not.toBeNull(),
    );

    await chooseLevel(/sans aide/i);

    expect(container.querySelector('[data-part="opportunity"]')).toBeNull();
    expect(container.innerHTML).not.toContain(OPPORTUNITY_TERM);
  });
});

describe("Analyse — at the engine levels, the Opportunity is visible on the opponent's ply", () => {
  it("shows it at Annoté, with its word, on the opponent's ply and on no other", async () => {
    stub();
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await chooseLevel(/annoté/i);

    const chips = await waitFor(() => {
      const found = container.querySelectorAll('[data-part="opportunity"]');
      expect(found.length).toBeGreaterThan(0);
      return found;
    });
    // Exactly as many chips as the payload has Opportunities — not one more.
    expect(chips.length).toBe(PLIES.filter((ply) => ply.opportunity !== null).length);
    // The word, never the colour alone (ADR-0013).
    expect(chips[0].textContent).toContain(OPPORTUNITY_TERM);
    expect(chips[0].getAttribute("aria-label")).toMatch(/bévue/i);
  });

  it("carries the severity on data-opportunity and NEVER on data-severity", async () => {
    // The blocking finding of slice 04, anchored on its cause rather than its
    // effect: `_semantics` tints *any* `[data-severity]` into a filled chip in
    // the Player's fault colours, and jsdom loads no stylesheet to catch it.
    stub();
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await chooseLevel(/annoté/i);

    const chip = await waitFor(() => {
      const found = container.querySelector('[data-part="opportunity"]');
      expect(found).not.toBeNull();
      return found!;
    });
    expect(chip.getAttribute("data-opportunity")).toBe("blunder");
    expect(chip.hasAttribute("data-severity")).toBe(false);
  });

  it("keeps it at Détaillé, and the recap states the count beside the Player's figures", async () => {
    stub();
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await chooseLevel(/détaillé/i);

    await waitFor(() =>
      expect(container.querySelector('[data-part="opportunity"]')).not.toBeNull(),
    );
    const recap = await screen.findByRole("region", { name: /ce que cette partie apporte/i });
    const block = recap.querySelector('[data-part="recap-opportunities"]');
    expect(block).not.toBeNull();
    expect(block!.textContent).toContain(String(RECAP.opportunities.total));
  });

  it("does not move the Player's own figures by a point — the recap still counts only the Player", async () => {
    stub();
    render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await chooseLevel(/détaillé/i);

    const recap = await screen.findByRole("region", { name: /ce que cette partie apporte/i });
    const own = recap.textContent!.replace(
      recap.querySelector('[data-part="recap-opportunities"]')!.textContent!,
      "",
    );
    // `countedErrors` is 1 and the Opportunities are 3: if the two were ever
    // added, this sentence would read 4.
    expect(own).toContain(`Erreurs comptées : ${RECAP.countedErrors}`);
    expect(own).not.toContain(OPPORTUNITY_TERM);
  });

  it("adds no glyph to the evaluation curve — the drawing keeps speaking of the Player's Game", async () => {
    stub();
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await chooseLevel(/détaillé/i);

    const curve = await waitFor(() => {
      const found = container.querySelector('[data-part="curve"]');
      expect(found).not.toBeNull();
      return found!;
    });
    // Anchored on a COUNT, not on the absence of a word: an added glyph would be
    // written `??`/`?!` — the same notation the Player's own severities use —
    // so searching for « Opportunity » here could never fail, whatever the curve
    // drew. The curve marks the Player's flawed Moves; the payload has exactly
    // one of those and one Opportunity, so a curve that grew a mark counts two.
    const flawed = PLIES.filter((ply) => ply.severity !== null).length;
    expect(flawed).toBe(1);
    expect(PLIES.filter((ply) => ply.opportunity !== null).length).toBe(1);
    // The curve's marks are `[data-mark-label]` — the attribute that actually
    // carries them, not the one their name suggests.
    expect(curve.querySelectorAll("[data-mark-label]").length).toBe(flawed);
    expect(curve.querySelector("[data-opportunity]")).toBeNull();
    expect(curve.querySelector('[data-part="opportunity"]')).toBeNull();
  });

  it("never writes any of the three phrasings the vocabulary refuses", async () => {
    stub();
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await chooseLevel(/détaillé/i);

    await waitFor(() =>
      expect(container.querySelector('[data-part="opportunity"]')).not.toBeNull(),
    );
    expect(container.innerHTML).not.toMatch(/erreur de l'adversaire/i);
    expect(container.innerHTML).not.toMatch(/cadeau/i);
    expect(container.innerHTML).not.toMatch(/chance manquée/i);
  });
});

/**
 * **The relevé under the board names the `Opportunity`** (US-30, story 20 —
 * HP-03's second blocking finding, closed in slice 06).
 *
 * At `Détaillé` the move list flagged « ?! Opportunity » on four plies while
 * the `Relevé du coup` under the diagram read « Rien à signaler sur ce coup »
 * on the very same four. One screen flagged and un-flagged the same Move, and
 * the spec names the cartouche under the board among the three sites.
 *
 * The record's own sentence is right about what it is about — there is no
 * `Best line` to show on the opponent's Move — so what was missing is the
 * `Opportunity` beside it, from the module that owns the word.
 */
describe("Analyse — the relevé under the board says what the list says", () => {
  /** The panel the diagram sits above. */
  const record = (container: HTMLElement) =>
    container.querySelector('[data-part="record"]') as HTMLElement;

  async function atDetailedOnOpponentPly() {
    stub();
    const view = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await chooseLevel(/détaillé/i);
    await waitFor(() => expect(record(view.container)).not.toBeNull());
    // Ply 2 is the opponent's — the one the payload gives an `Opportunity`.
    await userEvent.click(await screen.findByRole("button", { name: "1…e5" }));
    return view;
  }

  it("names the Opportunity instead of « Rien à signaler » on the opponent's flagged ply", async () => {
    const { container } = await atDetailedOnOpponentPly();

    await waitFor(() => {
      const panel = record(container);
      expect(panel.textContent).toContain(OPPORTUNITY_TERM);
    });
    expect(record(container).textContent).not.toContain("Rien à signaler");
  });

  it("says it with the SAME words as the list, and its own accessible name", async () => {
    const { container } = await atDetailedOnOpponentPly();

    const inRecord = await waitFor(() => {
      const found = record(container).querySelector('[data-part="opportunity"]');
      expect(found).not.toBeNull();
      return found!;
    });
    const inList = container.querySelector(
      'ol [data-part="opportunity"]',
    )!;

    // One fact shown twice — so the two spellings must be one string.
    expect(inRecord.textContent).toBe(inList.textContent);
    expect(inRecord.getAttribute("aria-label")).toMatch(/bévue/i);
    // Never the Player's own severity hook: the sheet tints that one « votre
    // faute » (slice 04's blocking finding).
    expect(inRecord.hasAttribute("data-severity")).toBe(false);
  });

  it("still says « Rien à signaler » where there is genuinely nothing", async () => {
    stub();
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await chooseLevel(/détaillé/i);
    await waitFor(() => expect(container.querySelector('[data-part="record"]')).not.toBeNull());

    // Ply 0 is nobody's Move and carries no Opportunity: the panel that empties
    // silently reads as a panel that broke, so the sentence stays.
    expect(container.querySelector('[data-part="record"]')!.textContent).toContain(
      "Rien à signaler",
    );
  });

  it("leaks nothing at Unaided — the relevé is not a way around the blindfold", async () => {
    stub();
    const { container } = render(<GameViewer game={{ ...OPERA_GAME, analyzed: true }} />);
    await screen.findByRole("radiogroup", { name: /niveau de revue/i });
    await userEvent.click(await screen.findByRole("button", { name: "1…e5" }));

    expect(container.innerHTML).not.toContain(OPPORTUNITY_TERM);
    expect(container.innerHTML).not.toContain("opportunit");
  });
});
