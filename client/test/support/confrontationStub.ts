import { vi } from "vitest";

/**
 * The records the `Confrontation` route reads — **named exactly, and closed**.
 *
 * The route derives everything from records the app already serves elsewhere,
 * and a silent extra fetch would mean a second derivation of the method. So an
 * unnamed URL **throws**, loudly, rather than being answered by something
 * plausible.
 *
 * Shared by the two files that drive this screen, for one reason beyond
 * duplication: the guard was first written twice with `url.startsWith(
 * "/api/games/1")`, which is a **prefix** — any future `/api/games/1/<anything>`
 * would have been answered instead of caught, so the set the docblock called
 * closed was open on the right, and `/api/games/10` matched too. Written once,
 * the rule can only be weakened once.
 */

/** A Game with no Clock recorded — the time block is nobody's subject here. */
export const NO_CLOCK = {
  timeControl: null,
  plies: [],
  absence: "not-recorded" as const,
  precision: null,
  reading: null,
};

/** What a caller may substitute for the defaults. */
export interface ConfrontationStub {
  /** The confrontation answer — a 200 with a body, or one of the two 409s. */
  confrontation: { status: number; body: unknown };
  game?: unknown;
  annotations?: unknown;
  reading?: unknown;
  /** Records that must answer with a failure, by their exact path. */
  failing?: string[];
}

/**
 * Installs the stub. `gameId` is taken so the matching stays exact rather than
 * drifting back into a prefix the day a second Game appears in a fixture.
 */
export function stubConfrontation(stub: ConfrontationStub, gameId = 1) {
  const profile = { id: 3, handle: "Me", platform: "chess.com" };
  const routes = new Map<string, unknown>([
    ["/api/profiles", [profile]],
    // The current-Profile provider reads the ONE Profile as well as the list.
    // The prefix match this helper replaced was swallowing it — which is the
    // whole argument for naming paths: the set was two wider than it said.
    [`/api/profiles/${profile.id}`, profile],
    [
      `/api/games/${gameId}`,
      stub.game ?? { id: gameId, pgn: "1. e4 e5", opponent: "opp", playerColor: "white" },
    ],
    [
      `/api/games/${gameId}/annotations`,
      stub.annotations ?? { analyzed: true, plies: [], regime: null, recap: null, time: NO_CLOCK },
    ],
    [
      `/api/personal/${gameId}`,
      stub.reading ?? {
        gameId,
        sealedAt: "2026-08-25T10:00:00.000Z",
        engineSeenBeforeSeal: false,
        marks: [],
      },
    ],
  ]);

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      // The query string is the caller's business; the PATH is what is named.
      const path = url.split("?")[0];

      if (path === `/api/personal/${gameId}/confrontation`) {
        return {
          ok: stub.confrontation.status === 200,
          status: stub.confrontation.status,
          json: async () => stub.confrontation.body,
        } as Response;
      }
      if (stub.failing?.includes(path)) {
        return { ok: false, status: 500, json: async () => ({}) } as Response;
      }
      if (routes.has(path)) {
        return { ok: true, status: 200, json: async () => routes.get(path) } as Response;
      }
      throw new Error(`unexpected request: ${url}`);
    }),
  );
}
