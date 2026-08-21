import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { ProfilesPage } from "../src/pages/ProfilesPage";
import type { Profile } from "../src/types";

const DUDUL: Profile = {
  id: 1,
  platform: "chesscom",
  username: "DudulSmash",
  createdAt: "2026-08-18T10:00:00.000Z",
  games: 166,
  analyzed: 20,
};
const HIKARU: Profile = { ...DUDUL, id: 2, username: "Hikaru" };
/** The same account name on another Platform — two Profiles, never one. */
const METALYST: Profile = { ...DUDUL, id: 3, platform: "lichess", username: "Metalyst" };

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProfilesPage />
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("ProfilesPage — with no Profile yet", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => json([])));
  });

  it("invites the Player to create one rather than showing an empty list", async () => {
    renderPage();

    const region = await screen.findByRole("region", { name: /profils/i });
    expect(within(region).getByRole("heading", { level: 2, name: /profils/i })).toBeTruthy();
    expect(await screen.findByText(/aucun profil/i)).toBeTruthy();
    expect(screen.queryByRole("list", { name: /profils/i })).toBeNull();
    // The way out of the empty state is on screen.
    expect(screen.getByRole("form", { name: /nouveau profil/i })).toBeTruthy();
  });
});

describe("ProfilesPage — the Profiles it knows", () => {
  it("lists each one with its platform and the casing chess.com spells it in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json([DUDUL, HIKARU])));

    renderPage();

    const list = await screen.findByRole("list", { name: /profils/i });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("DudulSmash");
    expect(rows[0].textContent).toMatch(/chess\.com/i);
    expect(rows[1].textContent).toContain("Hikaru");
    // Each row leads to that Profile's own page — where its Import lives.
    expect(within(rows[0]).getByRole("link", { name: /DudulSmash/i }).getAttribute("href")).toBe(
      "/profiles/1",
    );
    expect(screen.queryByText(/aucun profil/i)).toBeNull();
  });

  it("names each Profile's own Platform, so two same-named ones are told apart before selecting", async () => {
    // The list is where a Player picks; picking the wrong site's Profile is the
    // mistake this naming exists against (US-12).
    vi.stubGlobal("fetch", vi.fn(async () => json([DUDUL, METALYST])));

    renderPage();

    const list = await screen.findByRole("list", { name: /profils/i });
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0].textContent).toMatch(/chess\.com/i);
    expect(rows[1].textContent).toMatch(/Lichess/);
    expect(rows[1].textContent).not.toMatch(/chess\.com/i);
  });

  it("says how big each Profile's history is, and how much of it is analyzed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json([DUDUL, { ...HIKARU, games: 0, analyzed: 0 }])));

    renderPage();

    const rows = within(await screen.findByRole("list", { name: /profils/i })).getAllByRole(
      "listitem",
    );
    expect(rows[0].textContent).toMatch(/166\s*parties/i);
    expect(rows[0].textContent).toMatch(/20\s*analys/i);
    // A Profile with nothing under it says so in figures rather than staying silent.
    expect(rows[1].textContent).toMatch(/0\s*partie/i);
  });

  it("surfaces the reason chess.com refused, and adds nothing to the list", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (opts?.method === "POST")
          return json({ error: "Compte chess.com introuvable : ghost" }, 404);
        return json([DUDUL]);
      }),
    );
    const user = userEvent.setup();

    renderPage();
    await screen.findByRole("list", { name: /profils/i });
    await user.type(screen.getByLabelText(/compte chess\.com/i), "ghost");
    await user.click(screen.getByRole("button", { name: /ajouter/i }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/introuvable.*ghost/i);
    expect(within(screen.getByRole("list", { name: /profils/i })).getAllByRole("listitem"))
      .toHaveLength(1);
  });
});

describe("ProfilesPage — the current Profile", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => json([DUDUL, HIKARU])));
  });

  /** The row for a Profile, found by the username it carries. */
  const rowFor = (name: string) =>
    within(screen.getByRole("list", { name: /profils/i }))
      .getAllByRole("listitem")
      .find((li) => li.textContent?.includes(name))!;

  it("marks the chosen Profile as the current one, in words and not by colour", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("list", { name: /profils/i });

    await user.click(within(rowFor("Hikaru")).getByRole("button", { name: /sélectionner/i }));

    // Said in words on the row — the cue survives a Player who sees no colour.
    expect(within(rowFor("Hikaru")).getByText(/profil actuel/i)).toBeTruthy();
    expect(rowFor("Hikaru").getAttribute("data-current")).toBe("true");
    expect(rowFor("DudulSmash").getAttribute("data-current")).toBeNull();
    // Nothing to select on the row that is already current.
    expect(within(rowFor("Hikaru")).queryByRole("button", { name: /sélectionner/i })).toBeNull();
  });

  it("offers one Import button that leads straight to the current Profile's import", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("list", { name: /profils/i });

    await user.click(within(rowFor("Hikaru")).getByRole("button", { name: /sélectionner/i }));

    // ONE button, not one per row: the Import acts on the current Profile, and
    // the Player reached this screen to say which that is.
    const imports = screen.getAllByRole("link", { name: /importer/i });
    expect(imports).toHaveLength(1);
    // It goes where the Import lives, and asks for it rather than merely
    // landing on the page.
    expect(imports[0].getAttribute("href")).toBe("/profiles/2#import");
  });

  it("does not offer the Import while no Profile is current — there is nobody to import for", async () => {
    renderPage();
    await screen.findByRole("list", { name: /profils/i });

    // Nothing selected yet: an Import button here could only act on nobody, and
    // the rows already offer the step that comes first.
    expect(screen.queryByRole("link", { name: /importer/i })).toBeNull();
    expect(within(rowFor("DudulSmash")).getByRole("button", { name: /sélectionner/i })).toBeTruthy();
  });

  it("still points at the same Profile after a reload", async () =>{
    const user = userEvent.setup();
    const first = renderPage();
    await screen.findByRole("list", { name: /profils/i });
    await user.click(within(rowFor("Hikaru")).getByRole("button", { name: /sélectionner/i }));

    first.unmount(); // the app is closed and opened again
    renderPage();
    await screen.findByRole("list", { name: /profils/i });

    expect(within(rowFor("Hikaru")).getByText(/profil actuel/i)).toBeTruthy();
  });
});

describe("ProfilesPage — creating lands me on the Profile", () => {
  const rowFor = (name: string) =>
    within(screen.getByRole("list", { name: /profils/i }))
      .getAllByRole("listitem")
      .find((li) => li.textContent?.includes(name))!;

  it("makes the created Profile current — and the EXISTING one when the casing differs", async () => {
    // The server answers the existing Profile rather than a second one; what the
    // Player must observe is that they end up ON it, with no new entry.
    let created = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, opts?: RequestInit) => {
        if (opts?.method === "POST") {
          const answer = created ? json(DUDUL) : json(DUDUL, 201);
          created = true;
          return answer;
        }
        return json(created ? [DUDUL] : []);
      }),
    );
    const user = userEvent.setup();

    renderPage();
    await screen.findByText(/aucun profil/i);
    await user.type(screen.getByLabelText(/compte chess\.com/i), "dudulsmash");
    await user.click(screen.getByRole("button", { name: /ajouter/i }));

    await screen.findByRole("list", { name: /profils/i });
    expect(within(rowFor("DudulSmash")).getByText(/profil actuel/i)).toBeTruthy();

    // Again, in another casing: still one entry, still the one I am on.
    await user.type(screen.getByLabelText(/compte chess\.com/i), "DUDULSMASH");
    await user.click(screen.getByRole("button", { name: /ajouter/i }));

    expect(within(screen.getByRole("list", { name: /profils/i })).getAllByRole("listitem"))
      .toHaveLength(1);
    expect(within(rowFor("DudulSmash")).getByText(/profil actuel/i)).toBeTruthy();
  });
});

describe("ProfilesPage — deleting a Profile", () => {
  const rowFor = (name: string) =>
    within(screen.getByRole("list", { name: /profils/i }))
      .getAllByRole("listitem")
      .find((li) => li.textContent?.includes(name))!;

  /** A fetch whose list drops HIKARU once it has been deleted. */
  function stubWithDeletion() {
    let deleted = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (opts?.method === "DELETE") {
          deleted = true;
          return json(null, 204);
        }
        return json(deleted ? [DUDUL] : [DUDUL, HIKARU]);
      }),
    );
  }

  it("asks first, naming the Profile it is about to destroy, and can be called off", async () => {
    stubWithDeletion();
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("list", { name: /profils/i });

    await user.click(within(rowFor("Hikaru")).getByRole("button", { name: /supprimer/i }));

    // The confirmation NAMES it — deleting the wrong one by reflex is the risk.
    const confirmation = await screen.findByRole("alertdialog");
    expect(confirmation.textContent).toContain("Hikaru");
    await user.click(within(confirmation).getByRole("button", { name: /annuler/i }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(rowFor("Hikaru")).toBeTruthy(); // still there
  });

  it("removes it once confirmed, and leaves nothing selected when it was the current one", async () => {
    stubWithDeletion();
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("list", { name: /profils/i });
    await user.click(within(rowFor("Hikaru")).getByRole("button", { name: /sélectionner/i }));

    await user.click(within(rowFor("Hikaru")).getByRole("button", { name: /supprimer/i }));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: /supprimer/i }),
    );

    await within(screen.getByRole("list", { name: /profils/i })).findAllByRole("listitem");
    expect(screen.queryByText("Hikaru")).toBeNull();
    // Nothing is current: the app never points at something that no longer exists.
    expect(screen.queryByText(/profil actuel/i)).toBeNull();
  });
});
