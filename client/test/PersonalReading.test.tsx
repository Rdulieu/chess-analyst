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
      if (init?.method === "POST" && url.includes("/seal")) {
        // The server's own refusals, so the fake cannot flatter the screen.
        if (current.marks.length === 0)
          return { ok: false, status: 409, json: async () => ({ reason: "empty", error: "Cette lecture est vide." }) } as Response;
        if (current.sealedAt !== null)
          return { ok: false, status: 409, json: async () => ({ reason: "already-sealed", error: "Déjà scellée." }) } as Response;
        const { engineSeen } = JSON.parse(String(init.body)) as { engineSeen: boolean };
        current = { ...current, sealedAt: "2026-08-24T18:00:00.000Z", engineSeenBeforeSeal: engineSeen };
        return { ok: true, status: 200, json: async () => current } as Response;
      }
      if (init?.method === "PUT") {
        const patch = JSON.parse(String(init.body)) as Record<string, unknown>;
        const ply = Number(url.split("/marks/")[1].split("?")[0]);
        const layer = current.sealedAt !== null;
        const rest = current.marks.filter((m) => !(m.ply === ply && m.posterior === layer));
        const was =
          current.marks.find((m) => m.ply === ply && m.posterior === layer) ??
          (layer ? current.marks.find((m) => m.ply === ply && !m.posterior) : undefined);
        const mark = {
          ply,
          declaredSeverity: null,
          note: null,
          keyMoment: false,
          ...was,
          ...patch,
          posterior: layer,
        };
        // The server's own rules, so the fake cannot flatter the screen: a blank
        // Note is no Note, and a ply with nothing left said about it has no mark.
        if (typeof mark.note === "string") mark.note = mark.note.trim() || null;
        const silent = !mark.declaredSeverity && !mark.note && !mark.keyMoment;
        current = {
          ...current,
          marks: (silent ? rest : [...rest, mark]).sort(
            (a, b) => a.ply - b.ply || Number(a.posterior) - Number(b.posterior),
          ),
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
    // The warning is the fieldset's own accessible NAME since US-22 — it warns
    // before the verdict can be posed instead of appearing above the radios and
    // pushing everything below it (ADR-0021). Said less often, never less
    // clearly: the wording is still there and still in words.
    expect(screen.queryByRole("group", { name: /non notés/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Next" })); // 1... e5, the opponent's
    expect(screen.getByRole("group", { name: /coups adverses non notés/i })).not.toBeNull();

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
    // Leaving the field is what commits it since US-22 — writing a Note costs no
    // more clicks than posing a verdict, and the screen says it was kept.
    await user.tab();
    expect(screen.getByText("Note enregistrée.")).not.toBeNull();

    await waitFor(() =>
      expect(calls.some((c) => c.startsWith("PUT /api/personal/1/marks/1"))).toBe(true),
    );
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement).value).toBe(
        "je joue ça par habitude",
      ),
    );
  });

  it("keeps a Note the Player typed and then stepped away from, with no click at all", async () => {
    // The loss this slice closes. The draft was local state reset to the stored
    // value the moment the ply changed, so typing a Note and clicking `Next`
    // threw it away **in silence** — on the one part of the screen where the
    // Player thinks. Nothing warned, nothing held it.
    const calls = stubReading();
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.type(screen.getByRole("textbox", { name: /ma note/i }), "je joue ça par habitude");

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(calls.some((c) => c.startsWith("PUT /api/personal/1/marks/1"))).toBe(true),
    );

    // And it is there on the way back.
    await user.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement).value).toBe(
        "je joue ça par habitude",
      ),
    );
  });

  it("says what the Note's state is, and says it from an element that never comes or goes", async () => {
    // A confirmation that appears and disappears would rebuild, three slices
    // later, the very defect slice 02 closed — and under the Player's own hands,
    // since the erase button sits directly below it (ADR-0021). So the element is
    // always there and only its words change.
    const user = userEvent.setup();
    stubReading();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const stateLine = () => document.querySelector('[data-part="note-state"]');
    const count = () => document.querySelectorAll('[data-part="note-state"]').length;

    expect(stateLine()?.textContent).toBe("Aucune note sur ce coup.");
    expect(count()).toBe(1);

    await user.type(screen.getByRole("textbox", { name: /ma note/i }), "une idée");
    expect(stateLine()?.textContent).toBe("Enregistrée en quittant le champ.");
    expect(count()).toBe(1);

    await user.tab();
    await waitFor(() => expect(stateLine()?.textContent).toBe("Note enregistrée."));
    expect(count()).toBe(1);
  });

  it("does not erase a Note because the box was emptied and left — erasing is its own act", async () => {
    // The mirror of the loss this slice closes. A select-all-and-delete followed
    // by a click elsewhere is not a decision to unsay something; the button is.
    const calls = stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: null, note: "à revoir", keyMoment: false, posterior: false }],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.clear(screen.getByRole("textbox", { name: /ma note/i }));
    await user.tab();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Previous" }));

    expect(calls.filter((c) => c.startsWith("PUT "))).toEqual([]);
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement).value).toBe(
        "à revoir",
      ),
    );
  });

  it("puts the stored Note back when the box is emptied and left, rather than looking erased", async () => {
    // Measured on the FP of 2026-08-28: after emptying and blurring, the box was
    // empty, the line said "Note enregistrée." and the erase button was live —
    // three things that cannot all be true at once, in precisely the moment a
    // Player is most afraid of having lost something. The Note is safe; the
    // screen has to say so.
    const user = userEvent.setup();
    stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: null, note: "à revoir", keyMoment: false, posterior: false }],
    });
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.clear(screen.getByRole("textbox", { name: /ma note/i }));
    await user.tab();

    expect((screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement).value).toBe(
      "à revoir",
    );
    expect(document.querySelector('[data-part="note-state"]')?.textContent).toBe("Note enregistrée.");
  });

  it("says what the field is about at the starting Position, where it is about the Game", async () => {
    // The label already knew; the state line was still saying "ce coup" under a
    // field labelled "Ma note sur la partie".
    stubReading();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    expect(document.querySelector('[data-part="note-state"]')?.textContent).toBe(
      "Aucune note sur la partie.",
    );
  });

  it("commits an EDIT of a stored Note with the values of the Move being left", async () => {
    // The sharpest form of the addressing bug: React renders the new ply before
    // it runs the old ply's cleanup, so anything the cleanup reads from a ref
    // assigned during render already belongs to the Move stepped TO. Here ply 1
    // holds a Note and ply 2 holds none, so a stale read would take the new
    // Move's `null` for the old Move's stored value.
    const calls = stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: null, note: "première idée", keyMoment: false, posterior: false }],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const box = screen.getByRole("textbox", { name: /ma note/i });
    await user.clear(box);
    await user.type(box, "je change d'avis");
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(calls.some((c) => c.startsWith("PUT /api/personal/1/marks/1"))).toBe(true),
    );
    expect(calls.some((c) => c.startsWith("PUT /api/personal/1/marks/2"))).toBe(false);

    await user.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement).value).toBe(
        "je change d'avis",
      ),
    );
  });

  it("keeps an edit whose new text happens to equal what the NEXT Move stores", async () => {
    // The sharpest case, and the FP's rather than mine (2026-08-28). A cleanup
    // reading the ply stepped TO would compare the edit against *that* Move's
    // stored text, judge it unchanged, and drop it in silence — the loss this
    // slice exists to close, hidden behind a coincidence of wording.
    const calls = stubReading({
      ...EMPTY,
      marks: [
        { ply: 1, declaredSeverity: null, note: "différente", keyMoment: false, posterior: false },
        { ply: 2, declaredSeverity: null, note: "commun", keyMoment: false, posterior: false },
      ],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const box = screen.getByRole("textbox", { name: /ma note/i });
    await user.clear(box);
    await user.type(box, "commun");
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(calls.some((c) => c.startsWith("PUT /api/personal/1/marks/1"))).toBe(true),
    );
    await user.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() =>
      expect((screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement).value).toBe(
        "commun",
      ),
    );
  });

  it("writes nothing at all when the Player steps away from a Note they did not touch", async () => {
    const calls = stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: null, note: "inchangée", keyMoment: false, posterior: false }],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("textbox", { name: /ma note/i }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(calls.filter((c) => c.startsWith("PUT "))).toEqual([]);
  });

  it("files a Note under the Move it was written about, not the Move stepped to", async () => {
    const calls = stubReading();
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    await user.click(screen.getByRole("button", { name: "Next" })); // ply 1
    await user.type(screen.getByRole("textbox", { name: /ma note/i }), "sur e4");
    await user.click(screen.getByRole("button", { name: "Next" })); // ply 2

    await waitFor(() =>
      expect(calls.some((c) => c.startsWith("PUT /api/personal/1/marks/1"))).toBe(true),
    );
    expect(calls.some((c) => c.startsWith("PUT /api/personal/1/marks/2"))).toBe(false);
    // And the box is the new Move's, empty — a Note never follows the Player.
    expect((screen.getByRole("textbox", { name: /ma note/i }) as HTMLTextAreaElement).value).toBe("");
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

  it("marks the Move being read as where the Game turned, and says it is not a verdict", async () => {
    const calls = stubReading();
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const pivot = screen.getByRole("checkbox", { name: /moment clé/i });
    expect((pivot as HTMLInputElement).checked).toBe(false);
    await user.click(pivot);

    await waitFor(() =>
      expect(calls.some((c) => c.startsWith("PUT /api/personal/1/marks/1"))).toBe(true),
    );
    await waitFor(() =>
      expect((screen.getByRole("checkbox", { name: /moment clé/i }) as HTMLInputElement).checked).toBe(true),
    );
    // A pivot is neither a good Move nor a fault, and the screen must say so —
    // otherwise the Player reads it as a sixth verdict, sitting right beside the
    // five real ones.
    expect(screen.getByText(/ni un bon coup ni une faute|pas un jugement/i)).not.toBeNull();
  });

  it("counts the Key moments posed, and imposes no ceiling on them", async () => {
    stubReading({
      ...EMPTY,
      marks: [4, 9, 21].map((ply) => ({
        ply,
        declaredSeverity: null,
        note: null,
        keyMoment: true,
        posterior: false,
      })),
    });
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    // The count beside the marks, the project's constant habit — marking twelve
    // Moves out of thirty is not forbidden, it is visible.
    expect(screen.getByText(/3 moments clés/i)).not.toBeNull();
  });

  it("takes a Key moment back without disturbing the verdict on the same Move", async () => {
    stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: "mistake", note: null, keyMoment: true, posterior: false }],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.click(screen.getByRole("checkbox", { name: /moment clé/i }));

    await waitFor(() =>
      expect((screen.getByRole("checkbox", { name: /moment clé/i }) as HTMLInputElement).checked).toBe(false),
    );
    const posed = within(screen.getByRole("group", { name: /mon verdict/i }))
      .getAllByRole("radio")
      .filter((r) => (r as HTMLInputElement).checked);
    expect((posed[0] as HTMLInputElement).value).toBe("mistake");
  });

  it("lets the Player take a verdict back, returning the Move to silence", async () => {
    stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: "good", note: null, keyMoment: false, posterior: false }],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    // Five exclusive radios can change a verdict but never unsay one, so silence
    // needs its own control — otherwise a misplaced verdict is permanent while a
    // Note is not.
    await user.click(screen.getByRole("button", { name: /retirer mon verdict/i }));

    await waitFor(() => {
      const posed = within(screen.getByRole("group", { name: /mon verdict/i }))
        .getAllByRole("radio")
        .filter((r) => (r as HTMLInputElement).checked);
      expect(posed).toEqual([]);
    });
  });

  it("does not offer to take back a verdict that was never posed", async () => {
    stubReading();
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      (screen.getByRole("button", { name: /retirer mon verdict/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

});

describe("sealing a reading", () => {
  const sealed = (over: Partial<PersonalAnalysis> = {}): PersonalAnalysis => ({
    ...EMPTY,
    sealedAt: "2026-08-20T10:00:00.000Z",
    engineSeenBeforeSeal: false,
    marks: [{ ply: 1, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false }],
    ...over,
  });

  it("names what sealing commits before doing it, and does nothing if the Player backs out", async () => {
    const calls = stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false }],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: /sceller ma lecture/i }));

    // Named before it happens, so nobody seals by reflex.
    const dialog = await screen.findByRole("alertdialog", { name: /sceller/i });
    expect(dialog.textContent).toMatch(/figé|fige/i);
    expect(dialog.textContent).toMatch(/définitif|ne peut pas être descellée|irréversible/i);

    await user.click(within(dialog).getByRole("button", { name: /annuler/i }));
    expect(calls.some((c) => c.includes("/seal"))).toBe(false);
  });

  it("seals on confirmation, and labels the reading as read unaided", async () => {
    const calls = stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false }],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, id: 1, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: /sceller ma lecture/i }));
    const dialog = await screen.findByRole("alertdialog", { name: /sceller/i });
    await user.click(within(dialog).getByRole("button", { name: /^sceller$/i }));

    await waitFor(() => expect(calls.some((c) => c.includes("/seal"))).toBe(true));
    await screen.findByText(/lue à l'aveugle/i);
  });

  it("labels the reading as read informed when the engine had been shown for THIS Game", async () => {
    localStorage.setItem("chess-analyst.engine-seen", JSON.stringify([1]));
    stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false }],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, id: 1, analyzed: true }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: /sceller ma lecture/i }));
    await user.click(
      within(await screen.findByRole("alertdialog", { name: /sceller/i })).getByRole("button", {
        name: /^sceller$/i,
      }),
    );

    await screen.findByText(/lue informée/i);
  });

  it("stays 'unaided' when the engine was shown for ANOTHER Game — provenance is per Game", async () => {
    localStorage.setItem("chess-analyst.engine-seen", JSON.stringify([99]));
    stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false }],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, id: 1, analyzed: true }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: /sceller ma lecture/i }));
    await user.click(
      within(await screen.findByRole("alertdialog", { name: /sceller/i })).getByRole("button", {
        name: /^sceller$/i,
      }),
    );

    await screen.findByText(/lue à l'aveugle/i);
  });

  it("refuses to seal an empty reading, with its reason, and does not ask first", async () => {
    stubReading();
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    // Nothing to confront: the act is not offered, and the reason is said.
    expect((screen.getByRole("button", { name: /sceller ma lecture/i }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/rien à confronter|lecture est vide|au moins une marque/i)).not.toBeNull();
    await user.click(screen.getByRole("button", { name: /sceller ma lecture/i }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("offers nothing that unseals a sealed reading", async () => {
    stubReading(sealed());
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    // A sealed reading stays sealed: no control anywhere reopens it.
    expect(screen.queryByRole("button", { name: /desceller|rouvrir|annuler le scellement/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /sceller ma lecture/i })).toBeNull();
  });

  it("never claims to have prevented the Player from seeing the engine", async () => {
    stubReading(sealed());
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    // The app labels a reading; it cannot make anyone blind and must not say it
    // did (the reason the glossary rejected the name "Blind mode").
    expect(document.body.textContent).not.toMatch(/empêch|garanti|vous n'avez pas pu voir/i);
  });

  it("keeps writing possible after the seal, and says what is written is posterior", async () => {
    stubReading(sealed());
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.click(
      within(screen.getByRole("group", { name: /mon verdict/i })).getByRole("radio", {
        name: /bévue/i,
      }),
    );

    // Discovering the engine and understanding why is the most fertile moment of
    // the exercise, so writing stays open — and what is added is marked as coming
    // after, in words.
    // The notice, by its own part rather than by its words: "posterior" is now
    // said in several places on purpose, so matching on the phrase alone would
    // find them all.
    await waitFor(() =>
      expect(document.querySelector('[data-part="posterior-notice"]')?.textContent).toMatch(
        /postérieure/i,
      ),
    );
    // And the layer is legible AT the control, not only in a paragraph above it:
    // a Player scrolled past the notice would otherwise see a control identical
    // to the pre-seal one.
    expect(screen.getByRole("group", { name: /verdict.*après le scellement/i })).not.toBeNull();
    expect(screen.getByRole("textbox", { name: /note.*après le scellement/i })).not.toBeNull();
  });

  it("keeps the sealed reading readable exactly as it was, beside what came after", async () => {
    stubReading({
      ...sealed(),
      marks: [
        { ply: 1, declaredSeverity: "sound", note: "je ne vois rien à reprocher", keyMoment: false, posterior: false },
        { ply: 1, declaredSeverity: "blunder", note: "en fait je perds une pièce", keyMoment: false, posterior: true },
      ],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    // Both layers legible, and told apart in words rather than by colour alone.
    const initial = screen.getByRole("group", { name: /ma lecture scellée/i });
    expect(initial.textContent).toMatch(/correct/i);
    expect(initial.textContent).toMatch(/je ne vois rien à reprocher/i);
    const posed = within(screen.getByRole("group", { name: /mon verdict/i }))
      .getAllByRole("radio")
      .filter((r) => (r as HTMLInputElement).checked);
    expect((posed[0] as HTMLInputElement).value).toBe("blunder");
  });

});

describe("seeing where I stand in a reading", () => {
  it("marks, in the move list, which Moves carry a verdict, a Note, a Key moment", async () => {
    stubReading({
      ...EMPTY,
      marks: [
        { ply: 1, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false },
        { ply: 2, declaredSeverity: null, note: "pourquoi", keyMoment: false, posterior: false },
        { ply: 3, declaredSeverity: null, note: null, keyMoment: true, posterior: false },
      ],
    });
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    const items = moveItems();
    // Spotted without opening each Move — and the three kinds told apart, each
    // with its own accessible name rather than one anonymous dot.
    const verdict = within(items[0]).getByLabelText(/verdict/i);
    const note = within(items[1]).getByLabelText(/note/i);
    const pivot = within(items[2]).getByLabelText(/moment clé/i);
    // Told apart by their accessible names AND by what is drawn: three marks the
    // eye cannot separate would defeat the point of putting them in the list.
    expect(new Set([verdict.textContent, note.textContent, pivot.textContent]).size).toBe(3);
    // And a Move nobody wrote on carries nothing at all.
    expect(within(items[4]).queryByLabelText(/verdict|note|moment clé/i)).toBeNull();
  });

  it("says WHICH verdict each Move carries, not merely that one exists", async () => {
    // `⚖` said "a verdict was posed here" and nothing more: the Player had to
    // open every marked Move to find out which. The five values take their own
    // marks — the three shared with the engine written exactly as the engine
    // writes them, because it is the same scale and the Player has no second
    // vocabulary to learn (CONTEXT.md → Declared severity).
    stubReading({
      ...EMPTY,
      marks: (["blunder", "mistake", "inaccuracy", "good", "sound"] as const).map((s, i) => ({
        ply: i + 1,
        declaredSeverity: s,
        note: null,
        keyMoment: false,
        posterior: false,
      })),
    });
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    const items = moveItems();
    expect(within(items[0]).getByLabelText(/verdict/i).textContent).toBe("??");
    expect(within(items[1]).getByLabelText(/verdict/i).textContent).toBe("?");
    expect(within(items[2]).getByLabelText(/verdict/i).textContent).toBe("?!");
    // The two the engine has no band for EXTEND the notation rather than borrow
    // it: `!` is chess notation's own sign for a good Move, and `✓` comes from
    // another family on purpose — `Correct` is not a judgement of quality but a
    // statement of examination.
    expect(within(items[3]).getByLabelText(/verdict/i).textContent).toBe("!");
    expect(within(items[4]).getByLabelText(/verdict/i).textContent).toBe("✓");
  });

  it("names the verdict it draws, so the mark is never the only carrier", async () => {
    stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: "sound", note: null, keyMoment: false, posterior: false }],
    });
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    expect(within(moveItems()[0]).getByLabelText(/verdict/i).getAttribute("aria-label")).toBe(
      "verdict : Correct",
    );
  });

  it("marks a Move judged Correct, and leaves a Move never examined bare", async () => {
    // The glossary forbids folding these two together, word for word: silence is
    // not a value. Without a mark of its own, "I looked and I find nothing to
    // fault" would be indistinguishable from "I never came here".
    stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: "sound", note: null, keyMoment: false, posterior: false }],
    });
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    const items = moveItems();
    expect(within(items[0]).getByLabelText(/verdict/i)).not.toBeNull();
    expect(within(items[1]).queryByLabelText(/verdict|note|moment clé/i)).toBeNull();
  });

  it("lets a verdict, a Note and a Key moment sit on one Move without merging", async () => {
    // Three statements, three marks, three names. The FP of US-16a proved that
    // "nothing by tint alone" can be kept to the letter and missed in practice:
    // two pencils the accessible names told apart perfectly and the eye did not.
    stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: "good", note: "pourquoi", keyMoment: true, posterior: false }],
    });
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    const row = moveItems()[0];
    const drawn = [
      within(row).getByLabelText(/verdict/i),
      within(row).getByLabelText(/note/i),
      within(row).getByLabelText(/moment clé/i),
    ].map((el) => el.textContent);
    expect(drawn).toEqual(["!", "✎", "◆"]);
    // Three different marks, not three names over one drawing.
    expect(new Set(drawn).size).toBe(3);
  });

  it("states how far the reading has got — how many Moves annotated, out of how many", async () => {
    stubReading({
      ...EMPTY,
      marks: [1, 2, 3].map((ply) => ({
        ply,
        declaredSeverity: "sound" as const,
        note: null,
        keyMoment: false,
        posterior: false,
      })),
    });
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    const readout = screen.getByText(/coups annotés/i);
    // The count beside the share, never the share alone.
    expect(readout.textContent).toMatch(/3\s*\/\s*33/);
    expect(readout.textContent).toMatch(/9\s*%/);
  });

  it("computes no correctness at all — that is US-16b, and it must not leak here", async () => {
    stubReading({
      ...EMPTY,
      marks: [{ ply: 1, declaredSeverity: "blunder", note: null, keyMoment: false, posterior: false }],
    });
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: true }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    expect(document.body.textContent).not.toMatch(/juste|exact|correct à|score|bonne réponse|vous avez trouvé/i);
  });

  it("groups the reading's own figures together, apart from the explanations", async () => {
    stubReading({
      ...EMPTY,
      marks: [
        { ply: 1, declaredSeverity: "sound", note: null, keyMoment: true, posterior: false },
        { ply: 2, declaredSeverity: null, note: null, keyMoment: true, posterior: false },
      ],
    });
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    // Coverage and the Key moment count are the reading's tally; they must not
    // read as a second line of the notice that happens to sit above them.
    const tally = screen.getByRole("group", { name: /où j'en suis/i });
    expect(within(tally).getByText(/coups annotés/i)).not.toBeNull();
    expect(within(tally).getByText(/moments clés/i)).not.toBeNull();
  });

  it("surfaces the Game-wide Note from anywhere in the Game, not only at the start", async () => {
    stubReading({
      ...EMPTY,
      marks: [
        { ply: 0, declaredSeverity: null, note: "je subis cette ouverture", keyMoment: false, posterior: false },
      ],
    });
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    // Written at the starting Position, but it is about the whole Game — so it
    // must be legible from inside the Game, not only from its first Position.
    const whole = screen.getByRole("group", { name: /note sur la partie/i });
    expect(whole.textContent).toMatch(/je subis cette ouverture/i);
  });

  it("says nothing about a Game-wide Note that was never written", async () => {
    stubReading();
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);

    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    // An empty panel announcing an absence is noise: silence stays silent here too.
    expect(screen.queryByRole("group", { name: /note sur la partie/i })).toBeNull();
  });
});

describe("what the Player clicks never moves (ADR-0021)", () => {
  /*
   * Measured 2026-08-27 on a 46-ply reading: **45 ply transitions out of 45**
   * displaced the step controls, by 24 to 114 px, 194 px of swing at 1400 and
   * 312 below 900. The panel is rendered in the same pane as the stepper, so what
   * moved was not decoration — it was the `Previous` / `Next` buttons under the
   * finger already reaching for them.
   *
   * The pixels belong to the theme pass (jsdom computes no geometry). What belongs
   * here is the ORDER, which is what ADR-0021 actually decides — and an order is
   * checked at every commit, hours before a portal run.
   */
  const legendOf = () => screen.getByRole("group", { name: /mon verdict/i }).querySelector("legend");

  /** Where each part sits in the rendered document, in reading order. */
  const orderOf = (...parts: string[]) =>
    parts.map((part) => {
      const found = [...document.querySelectorAll("[data-part]")].findIndex(
        (el) => el.getAttribute("data-part") === part,
      );
      if (found === -1) throw new Error(`no [data-part="${part}"] on screen`);
      return found;
    });

  const ascending = (values: number[]) => values.every((v, i) => i === 0 || v > values[i - 1]);

  it("puts the step controls above everything that varies with the ply", async () => {
    // The stepper used to be rendered BELOW the whole panel in the same pane, so
    // every block that came and went with the ply pushed the very buttons the
    // Player was clicking. The rule is about order, not about height: reserving a
    // fixed height would have cost 194 to 312 px of empty column exactly where the
    // column is scarcest, and the sealed readout has no knowable maximum anyway.
    const user = userEvent.setup();
    stubReading();
    render(<PersonalReading game={OPERA_GAME} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      ascending(orderOf("stepper", "declared-severity", "key-moment", "note", "tally")),
    ).toBe(true);
  });


  it("changes nothing above the stepper when the Player enters or leaves the starting Position", async () => {
    // Ply 0 has no Move to judge, so the verdict fieldset and the pivot control
    // are absent there — entering and leaving it is the transition where the most
    // blocks appear at once. Nothing above the stepper may differ between the two.
    const user = userEvent.setup();
    stubReading();
    render(<PersonalReading game={OPERA_GAME} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    const above = () => {
      const parts = [...document.querySelectorAll("[data-part]")];
      const stepper = parts.findIndex((el) => el.getAttribute("data-part") === "stepper");
      return parts.slice(0, stepper).map((el) => el.getAttribute("data-part"));
    };

    const atStart = above();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(above()).toEqual(atStart);
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(above()).toEqual(atStart);
  });

  it("keeps the order in the richest state there is — a sealed reading, on a marked Move", async () => {
    // After the seal the panel gains the sealed readout, the sealed mark and the
    // posterior notice, and the sealed mark's height depends on what was written
    // that day. That is the state the defect was worst in, and it is the state the
    // order has to hold in. Nothing is folded away to buy height: the sealed layer
    // stays readable exactly as it was.
    const user = userEvent.setup();
    stubReading({
      ...EMPTY,
      sealedAt: "2026-08-20T10:00:00.000Z",
      engineSeenBeforeSeal: false,
      marks: [
        {
          ply: 1,
          declaredSeverity: "mistake",
          note: "je pensais tenir le centre",
          keyMoment: true,
          posterior: false,
        },
      ],
    });
    render(<PersonalReading game={OPERA_GAME} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      ascending(
        orderOf(
          "stepper",
          "declared-severity",
          "key-moment",
          "note",
          "sealed",
          "sealed-mark",
          "posterior-notice",
          "tally",
        ),
      ),
    ).toBe(true);
    // Unabridged: what was written when the reading was sealed is still there to read.
    expect(screen.getByText(/je pensais tenir le centre/)).not.toBeNull();
  });

  it("files a Note written after the seal in the posterior layer, as the mouse always did", async () => {
    // The write path did not change — only what triggers it. A Note committed by
    // leaving the field must land in the same layer a Note committed by a button
    // landed in, or slice 04 would have quietly moved data across the seal.
    const user = userEvent.setup();
    stubReading({
      ...EMPTY,
      sealedAt: "2026-08-20T10:00:00.000Z",
      engineSeenBeforeSeal: false,
      marks: [{ ply: 1, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false }],
    });
    render(<PersonalReading game={OPERA_GAME} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.type(screen.getByRole("textbox", { name: /ma note/i }), "vu après coup");
    await user.tab();

    // Written, and read back as the posterior layer: the sealed verdict is still
    // there beside it, untouched.
    await waitFor(() => expect(screen.getByText("Note enregistrée.")).not.toBeNull());
    expect(document.querySelector('[data-part="sealed-mark"]')?.textContent).toContain("Erreur");
  });

  it("says nothing about opponents after the seal, because after the seal nothing is counted", async () => {
    // The one combination that WOULD wrap to a second line below 900 px is
    // "after the seal" + "opponents not scored" — and it is the one state that
    // cannot occur: `personal/confrontation.ts` filters posterior marks out
    // wholesale, so the opponent clause there would say nothing about a Move
    // nothing scores anyway. That is what keeps the fieldset one line tall.
    const user = userEvent.setup();
    stubReading({
      ...EMPTY,
      sealedAt: "2026-08-20T10:00:00.000Z",
      engineSeenBeforeSeal: false,
      marks: [{ ply: 1, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false }],
    });
    render(<PersonalReading game={OPERA_GAME} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    await user.click(screen.getByRole("button", { name: "Next" })); // the Player's own
    expect(legendOf()?.textContent).toBe("Mon verdict, après le scellement");

    await user.click(screen.getByRole("button", { name: "Next" })); // the opponent's
    expect(legendOf()?.textContent).toBe("Mon verdict, après le scellement");
  });

  it("names the opponent's Move in the legend — where it is read BEFORE the verdict can be posed", async () => {
    const user = userEvent.setup();
    stubReading();
    render(<PersonalReading game={OPERA_GAME} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    // 1. e4 — White's, and the Player is White.
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(legendOf()?.textContent).toBe("Mon verdict");

    // 1… e5 — the opponent's. The warning alternates every single Move, which is
    // why it was 33 of the 45 displacements: as a paragraph above the radios it
    // appeared and vanished under the Player's own stepping.
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(legendOf()?.textContent).toBe("Mon verdict — coups adverses non notés");
  });
});

describe("posing a verdict from the keyboard (US-22)", () => {
  const verdicts = () => screen.getByRole("group", { name: /mon verdict/i });
  const checked = () =>
    within(verdicts())
      .getAllByRole("radio")
      .filter((r) => (r as HTMLInputElement).checked)
      .map((r) => (r as HTMLInputElement).value);

  it("poses the five verdicts on 1 to 5, in the order the screen shows them", async () => {
    // Criterion 40 of US-16a wanted "few clicks, Move after Move". It was held for
    // the verdict alone, and with a mouse — the app had no keyboard shortcut at
    // all, and this is its first. The order is the glossary's, worst to best, so
    // there is nothing arbitrary to memorise: what the screen shows top to bottom
    // is what `1` to `5` pose.
    const user = userEvent.setup();
    stubReading();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.keyboard("1");
    await waitFor(() => expect(checked()).toEqual(["blunder"]));

    await user.keyboard("5");
    await waitFor(() => expect(checked()).toEqual(["good"]));
  });

  it("does not move the focus, which is what lets the loop run at all", async () => {
    // Posing a verdict from the keyboard is a COMMAND, not a click. If it moved
    // the focus into the radio group, the arrows would then walk the five values
    // instead of changing Move — and "verdict, next Move, verdict" would stop
    // after the first verdict.
    const user = userEvent.setup();
    stubReading();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const before = document.activeElement;
    await user.keyboard("2");
    await waitFor(() => expect(checked()).toEqual(["mistake"]));
    expect(document.activeElement).toBe(before);
  });

  it("runs the loop: verdict, next Move, verdict, without a single click", async () => {
    const user = userEvent.setup();
    stubReading();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(screen.getByLabelText("current move").textContent).toContain("e4"));
    await user.keyboard("3");
    await waitFor(() => expect(checked()).toEqual(["inaccuracy"]));

    await user.keyboard("{ArrowRight}");
    await waitFor(() => expect(screen.getByLabelText("current move").textContent).toContain("e5"));
    await user.keyboard("1");
    await waitFor(() => expect(checked()).toEqual(["blunder"]));

    await user.keyboard("{ArrowLeft}");
    await waitFor(() => expect(checked()).toEqual(["inaccuracy"]));
  });

  it("toggles the Key moment on k", async () => {
    const user = userEvent.setup();
    stubReading();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const pivot = () => screen.getByRole("checkbox", { name: /moment clé/i }) as HTMLInputElement;
    await user.keyboard("k");
    await waitFor(() => expect(pivot().checked).toBe(true));
    await user.keyboard("k");
    await waitFor(() => expect(pivot().checked).toBe(false));
  });

  it("is inert while a Note is being typed — the keys write text and nothing else", async () => {
    const user = userEvent.setup();
    stubReading();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const box = screen.getByRole("textbox", { name: /ma note/i });
    await user.click(box);
    await user.keyboard("1 coup sur 5, k{ArrowLeft}");

    expect((box as HTMLTextAreaElement).value).toContain("1 coup sur 5, k");
    expect(checked()).toEqual([]);
    expect((screen.getByRole("checkbox", { name: /moment clé/i }) as HTMLInputElement).checked).toBe(
      false,
    );
    // And the arrow moved the caret, not the Move.
    expect(screen.getByLabelText("current move").textContent).toContain("e4");
  });

  it("leaves a focused radio group its arrows — the app takes no arrow it is offered", async () => {
    // The convention assistive technology takes for granted: inside a radio
    // group, the arrows walk the group. The app's job is to keep its hands off,
    // and that is what is asserted here — the *walking* is the browser's, and
    // jsdom's user-event cannot simulate it (it throws inside `walkRadio`), so a
    // raw keydown is used and the assertion is that the Move did not change.
    const user = userEvent.setup();
    stubReading();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    const radio = within(verdicts()).getAllByRole("radio")[0];
    await user.click(radio);
    expect(checked()).toEqual(["blunder"]);

    const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    radio.dispatchEvent(event);

    // Not ours: not swallowed, and the Move stayed where it was.
    expect(event.defaultPrevented).toBe(false);
    expect(screen.getByLabelText("current move").textContent).toContain("e4");
  });

  it("poses no verdict at the starting Position, where there is no Move to judge", async () => {
    const calls = stubReading();
    const user = userEvent.setup();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    await user.keyboard("1");
    await user.keyboard("k");
    expect(calls.filter((c) => c.startsWith("PUT "))).toEqual([]);
  });

  it("says on the screen that the shortcuts exist, because one discovered by accident does not", async () => {
    stubReading();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: false }} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));

    // TWO notices since US-23 (D6), each announcing what it owns: the arrows come
    // from the board component, the verdict and the Key moment from this screen.
    // What matters is unchanged — every command on this screen is announced on it,
    // and each sentence is the same in every state, so neither can move anything.
    const notices = [...document.querySelectorAll('[data-part="shortcuts"]')];
    expect(notices).toHaveLength(2);
    const own = notices.find((n) => /verdict/i.test(n.textContent ?? ""))!;
    expect(own.textContent).toContain("1");
    expect(own.textContent).toContain("5");
    expect(own.textContent).toMatch(/moment clé/i);
    expect(notices.some((n) => /changer de coup/i.test(n.textContent ?? ""))).toBe(true);
  });

  it("writes into the posterior layer after the seal, exactly as the mouse does", async () => {
    const user = userEvent.setup();
    stubReading({
      ...EMPTY,
      sealedAt: "2026-08-20T10:00:00.000Z",
      engineSeenBeforeSeal: false,
      marks: [{ ply: 1, declaredSeverity: "mistake", note: null, keyMoment: false, posterior: false }],
    });
    render(<PersonalReading game={OPERA_GAME} profileId={1} />);
    await waitFor(() => expect(moveItems().length).toBeGreaterThan(20));
    await user.click(screen.getByRole("button", { name: "Next" }));

    await user.keyboard("5");
    await waitFor(() => expect(checked()).toEqual(["good"]));
    // The sealed layer is beside it, untouched.
    expect(document.querySelector('[data-part="sealed-mark"]')?.textContent).toContain("Erreur");
  });
});

describe("PersonalReading — who announces which command (US-23, D6)", () => {
  /*
   * The reading route announces the commands it owns — the verdict and the Key
   * moment — and no longer the arrows, which belong to the board component and
   * are announced by it. The Player still sees all three; they now come from two
   * places, each saying what it actually has.
   */
  it("announces the verdict and the Key moment, and leaves the arrows to the board", async () => {
    stubReading();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: true }} profileId={1} />);

    const own = await screen.findByText(/pour le verdict/i);
    expect(own.textContent).toMatch(/moment clé/i);
    // Not this notice's business any more.
    expect(own.textContent).not.toMatch(/changer de coup/i);
  });

  it("still shows the Player all three commands on that screen", async () => {
    stubReading();
    render(<PersonalReading game={{ ...OPERA_GAME, analyzed: true }} profileId={1} />);

    // Two notices, one screen: the arrows from the board, the rest from here.
    expect(await screen.findByText(/pour changer de coup/i)).toBeTruthy();
    expect(screen.getByText(/pour le verdict/i)).toBeTruthy();
  });
});
