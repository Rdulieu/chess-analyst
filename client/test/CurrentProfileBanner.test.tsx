import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { CurrentProfileBanner } from "../src/features/profiles/CurrentProfileBanner";
import type { Profile } from "../src/types";

const ALICE: Profile = {
  id: 7,
  platform: "chesscom",
  username: "Alice",
  createdAt: "2026-01-01",
  games: 3,
  analyzed: 1,
};

/**
 * The banner is not decoration. With friends' Profiles in the app, `/danger` and
 * `/openings` look identical for everyone, and reading a friend's recurring
 * mistakes while believing they are your own is a silent, easy confusion. The
 * banner is what makes the display unable to lie.
 */
describe("the current-Profile banner", () => {
  it("names the current Profile and leads to the profiles area", () => {
    render(
      <MemoryRouter>
        <CurrentProfileBanner profile={ALICE} />
      </MemoryRouter>,
    );

    const banner = screen.getByRole("complementary", { name: /profil courant/i });
    expect(within(banner).getByText(/Alice/)).toBeTruthy();
    expect(within(banner).getByRole("link").getAttribute("href")).toBe("/profiles");
  });

  it("says in words whose figures these are, so the marking never rests on colour", () => {
    render(
      <MemoryRouter>
        <CurrentProfileBanner profile={ALICE} />
      </MemoryRouter>,
    );

    // US-13's rule: a current/selected state is never told by colour alone.
    expect(screen.getByText(/profil courant/i)).toBeTruthy();
  });
});
