import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PersonalReading } from "../src/features/personal/PersonalReading";
import { OPERA_GAME } from "./fixtures";
import type { PersonalAnalysis } from "../src/types";

const EMPTY: PersonalAnalysis = {
  gameId: 1,
  sealedAt: null,
  engineSeenBeforeSeal: null,
  marks: [],
};

/**
 * The reading route talks to one endpoint only. A fake that answers **anything
 * else** loudly is the point: this route must never fetch the engine's record,
 * and a silent 404 would let it try without the suite noticing.
 */
function stubReading(reading: PersonalAnalysis = EMPTY) {
  const calls: string[] = [];
  let current = reading;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (!url.startsWith("/api/personal/")) throw new Error(`unexpected request: ${url}`);
      if (init?.method === "PUT") {
        const patch = JSON.parse(String(init.body)) as Record<string, unknown>;
        const ply = Number(url.split("/marks/")[1].split("?")[0]);
        const rest = current.marks.filter((m) => m.ply !== ply);
        const was = current.marks.find((m) => m.ply === ply);
        const mark = {
          ply,
          declaredSeverity: null,
          note: null,
          keyMoment: false,
          posterior: false,
          ...was,
          ...patch,
        };
        // The server's own rules, so the fake cannot flatter the screen: a blank
        // Note is no Note, and a ply with nothing left said about it has no mark.
        if (typeof mark.note === "string") mark.note = mark.note.trim() || null;
        const silent = !mark.declaredSeverity && !mark.note && !mark.keyMoment;
        current = {
          ...current,
          marks: (silent ? rest : [...rest, mark]).sort((a, b) => a.ply - b.ply),
        };
      }
      return { ok: true, status: 200, json: async () => current } as Response;
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

const moveItems = () =>
  within(screen.getByRole("list", { name: "moves" })).getAllByRole("listitem");

describe("the reading route", () => {
  it("reads the Game move by move, with its notation, on a Game the engine never touched", async () => {
    stubReading();

    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    // The Game is readable as soon as it is imported: no engine time is owed for
    // the Player to work on it.
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    expect(moveItems()[0].textContent).toContain("e4");
    expect((screen.getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows NOTHING of the engine, even on an analysed Game with Détaillé remembered", async () => {
    // The trap this route exists to close: the remembered level is the highest
    // one, and the Game has been analysed. A route that consulted the Review mode
    // would light up here.
    localStorage.setItem("chess-analyst.review-mode", "detailed");
    stubReading();

    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: true }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    // No level control, no evaluation, no severity glyph, no curve, no record.
    expect(screen.queryByRole("radiogroup", { name: /niveau de revue/i })).toBeNull();
    expect(screen.queryByLabelText("evaluation")).toBeNull();
    expect(screen.queryByRole("region", { name: /relevé/i })).toBeNull();
    expect(screen.queryByText(/avantage au fil de la partie/i)).toBeNull();
    for (const item of moveItems()) {
      expect(item.textContent).not.toContain("??");
      expect(item.textContent).not.toMatch(/[+-]\d+\.\d/);
    }
  });

  it("neither reads nor writes the Review mode — the route is blind because that is what it is", async () => {
    stubReading();
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const getItem = vi.spyOn(Storage.prototype, "getItem");

    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: true }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    const touched = [...setItem.mock.calls, ...getItem.mock.calls].map(([key]) => String(key));
    expect(touched.filter((key) => key.includes("review-mode"))).toEqual([]);
    setItem.mockRestore();
    getItem.mockRestore();
  });

  it("offers the five verdicts on the Move being read, and records the one the Player poses", async () => {
    const calls = stubReading();
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" })); // 1. e4, the Player's own

    const verdicts = screen.getByRole("group", { name: /mon verdict/i });
    expect(within(verdicts).getAllByRole("radio")).toHaveLength(5);

    await user.click(within(verdicts).getByRole("radio", { name: /bévue|blunder|gaffe/i }));

    await waitFor(() =>
      expect(calls.some((c) => c.startsWith("PUT /api/personal/1/marks/1"))).toBe(true),
    );
  });

  it("lets the Player change a verdict they already posed", async () => {
    stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: "blunder", note: null, keyMoment: false, posterior: false }],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const verdicts = screen.getByRole("group", { name: /mon verdict/i });
    const posed = within(verdicts).getAllByRole("radio").filter((r) => (r as HTMLInputElement).checked);
    expect(posed).toHaveLength(1);

    await user.click(within(verdicts).getByRole("radio", { name: /correct|sain|sound/i }));
    await waitFor(() => {
      const now = within(screen.getByRole("group", { name: /mon verdict/i }))
        .getAllByRole("radio")
        .filter((r) => (r as HTMLInputElement).checked);
      expect((now[0] as HTMLInputElement).value).toBe("sound");
    });
  });

  it("says, on an opponent's Move, that the verdict will not be scored — and takes it anyway", async () => {
    const calls = stubReading();
    const user = userEvent.setup();
    // The Player played White, so an even ply is the opponent's.
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false, playerColor: "white" }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.queryByText(/ne sera pas (noté|comptabilisé)/i)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Next" })); // 1... e5, the opponent's
    expect(screen.getByText(/ne sera pas (noté|comptabilisé)/i)).not.toBeNull();

    await user.click(
      within(screen.getByRole("group", { name: /mon verdict/i })).getByRole("radio", {
        name: /erreur|mistake/i,
      }),
    );
    await waitFor(() =>
      expect(calls.some((c) => c.startsWith("PUT /api/personal/1/marks/2"))).toBe(true),
    );
  });

  it("leaves a Move the Player said nothing about silent — no verdict is preselected", async () => {
    stubReading();
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const verdicts = within(screen.getByRole("group", { name: /mon verdict/i })).getAllByRole("radio");
    expect(verdicts.filter((r) => (r as HTMLInputElement).checked)).toEqual([]);
  });

  it("orients the board on the side the Player played", async () => {
    stubReading();
    const { container } = render(
      <PersonalReading game={{ ...OPERA_GAME, playerColor: "black" }} profileId={1} />,
    );

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    const squares = [...container.querySelectorAll("[data-square]")].map((el) =>
      el.getAttribute("data-square"),
    );
    expect(squares[0]).toBe("h1");
  });

  it("takes a Note on the Move being read, and shows it with that Move", async () => {
    const calls = stubReading();
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const note = screen.getByRole("textbox", { name: /ma note/i });
    await user.type(note, "je joue ça par habitude");
    await user.click(screen.getByRole("button", { name: /enregistrer la note/i }));

    await waitFor(() =>
      expect(calls.some((c) => c.startsWith("PUT /api/personal/1/marks/1"))).toBe(true),
    );
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement).value).toBe(
        "je joue ça par habitude",
      ),
    );
  });

  it("says outright that a Note is never graded — that is the point of it", async () => {
    stubReading();
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText(/jamais notée|jamais notées/i)).not.toBeNull();
  });

  it("offers a Note on the starting Position, read as the Game's own — and no verdict there", async () => {
    stubReading({
      ...EMPTY,
      marks: [
        { ply: 0, declaredSeverity: null, note: "ouverture que je subis", keyMoment: false, posterior: false },
      ],
    });
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    // Ply 0 is the starting Position: there is a Note to write about the Game as
    // a whole, and no Move to judge.
    expect((screen.getByRole("textbox", { name: /note/i }) as HTMLTextAreaElement).value).toBe(
      "ouverture que je subis",
    );
    expect(screen.queryByRole("group", { name: /mon verdict/i })).toBeNull();
  });

  it("carries the Note of the Move being read, and only that one", async () => {
    stubReading({
      ...EMPTY,
      marks: [
        { ply: 1, declaredSeverity: null, note: "sur e4", keyMoment: false, posterior: false },
        { ply: 2, declaredSeverity: null, note: "sur e5", keyMoment: false, posterior: false },
      ],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect((screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement).value).toBe(
      "sur e4",
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect((screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement).value).toBe(
      "sur e5",
    );
  });

  it("erases a Note without touching the verdict that stays beside it", async () => {
    stubReading({
      ...EMPTY,
      marks: [
        { ply: 1, declaredSeverity: "blunder", note: "à revoir", keyMoment: false, posterior: false },
      ],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.click(screen.getByRole("button", { name: /supprimer la note/i }));

    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement).value).toBe(""),
    );
    // The verdict is a separate statement and survives the erasure.
    const posed = within(screen.getByRole("group", { name: /mon verdict/i }))
      .getAllByRole("radio")
      .filter((r) => (r as HTMLInputElement).checked);
    expect((posed[0] as HTMLInputElement).value).toBe("blunder");
  });

  it("renders a Note's line breaks as written, rather than running them together", async () => {
    stubReading({
      ...EMPTY,
      marks: [
        { ply: 1, declaredSeverity: null, note: "première\nseconde", keyMoment: false, posterior: false },
      ],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const box = screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement;
    expect(box.value).toBe("première\nseconde");
  });
});
