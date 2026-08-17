import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ProfilePage } from "../src/pages/ProfilePage";

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

const PROFILE = {
  id: 7,
  platform: "chesscom" as const,
  username: "DudulSmash",
  createdAt: "2026-08-18T00:00:00.000Z",
  games: 166,
  analyzed: 20,
};

afterEach(() => vi.unstubAllGlobals());

/** Renders the page as the route does, with `id` in the URL. */
function renderPage(id = 7) {
  return render(
    <MemoryRouter initialEntries={[`/profiles/${id}`]}>
      <Routes>
        <Route path="/profiles/:id" element={<ProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProfilePage — one Profile's own page", () => {
  it("names the Profile the URL points at and shows what it holds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/profiles/7") return json(PROFILE);
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    renderPage();

    const region = await screen.findByRole("region", { name: /DudulSmash/i });
    expect(within(region).getByRole("heading", { level: 2, name: /DudulSmash/i })).toBeTruthy();
    // The counters the list shows, on the Profile's own page: imported, analyzed.
    expect(region.textContent).toMatch(/166/);
    expect(region.textContent).toMatch(/20/);
    expect(region.textContent).toMatch(/chess\.com/i);
  });

  it("carries that Profile's import form, and no username field", async () => {
    const posted: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, opts?: RequestInit) => {
        if (url === "/api/profiles/7") return json({ ...PROFILE, games: 0, analyzed: 0 });
        if (url === "/api/import" && opts?.method === "POST") {
          posted.push(JSON.parse(opts.body as string));
          return json({ running: false, total: 1, done: 1, result: null }, 202);
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    renderPage();

    const form = await screen.findByRole("form", { name: /import/i });
    expect(within(form).queryByLabelText(/username|compte/i)).toBeNull();
    expect(within(form).getByLabelText(/^du$/i)).toBeTruthy();
  });

  it("says so plainly when the URL names a Profile that does not exist", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "Profil introuvable." }, 404)));

    renderPage(9999);

    expect(await screen.findByRole("alert")).toBeTruthy();
  });

  it("reads as a bounded surface in the narrow reading column", async () => {
    // US-13: the default 72ch column — the page carries a form and a few
    // counters, nothing dense, so it has no claim on the wide variant. The
    // `card` surface is what frames it rather than leaving text in empty space.
    vi.stubGlobal("fetch", vi.fn(async () => json(PROFILE)));

    const { container } = renderPage();

    const section = await screen.findByRole("region", { name: /DudulSmash/i });
    expect(section.getAttribute("data-width")).toBeNull();
    expect(section.classList.contains("card")).toBe(true);
    expect(container.querySelector("[data-width='wide']")).toBeNull();
  });
});
