import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ScopedPage } from "../src/features/profiles/ScopedPage";
import { CurrentProfileProvider } from "../src/features/profiles/CurrentProfileContext";
import { saveCurrentProfileId } from "../src/features/profiles/currentProfile";

const json = (body: unknown, status = 200) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

const ALICE = { id: 7, platform: "chesscom", username: "Alice", createdAt: "", games: 3, analyzed: 1 };

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

/** The scoped page under a router that also holds the profiles area to land on. */
function renderScoped() {
  return render(
    <MemoryRouter initialEntries={["/danger"]}>
      <CurrentProfileProvider>
        <Routes>
          <Route
            path="/danger"
            element={<ScopedPage>{(profile) => <p>figures for {profile.username}</p>}</ScopedPage>}
          />
          <Route path="/profiles" element={<h2>Profils</h2>} />
        </Routes>
      </CurrentProfileProvider>
    </MemoryRouter>,
  );
}

describe("a scoped page with no Profile selected", () => {
  it("takes the Player to the profiles area rather than leaving an unexplained blank screen", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(ALICE)));

    renderScoped();

    expect(await screen.findByRole("heading", { name: /profils/i })).toBeTruthy();
  });
});

describe("a scoped page with a Profile selected", () => {
  it("renders the page about that Profile — no redirect", async () => {
    saveCurrentProfileId(7);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/profiles/7") return json(ALICE);
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    renderScoped();

    expect(await screen.findByText(/figures for Alice/i)).toBeTruthy();
  });
});
