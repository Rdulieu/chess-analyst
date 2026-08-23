import type { MonthFetch, PlatformAccount, PlatformClient } from "../types";
import type { ChessComGame } from "./payload";
import { toMonthFetch } from "./mapping";

/**
 * The chess.com adapter: the real client, talking to the public Published-Data
 * API over HTTP (ADR-0002: the relay is the only thing that talks to chess.com)
 * and answering the `PlatformClient` port's shapes (ADR-0018). `baseUrl` is
 * configurable (env `CHESSCOM_BASE_URL`, default the live API) so tests and the
 * agentic Feature Path can point it at a fixture archive.
 */

const DEFAULT_BASE_URL = "https://api.chess.com";

/**
 * The member's own spelling, read off the profile `url`'s last segment; falls
 * back to the `username` field when the payload carries no url. The public
 * endpoint answers `username` lowercased and keeps the member's own casing in
 * `url` (`.../member/DudulSmash`), so that segment is the canonical spelling.
 */
function canonicalUsername(body: { username?: string; url?: string }): string | undefined {
  const fromUrl = body.url?.split("/").filter(Boolean).pop();
  return fromUrl || body.username;
}

export function createHttpChessComClient(
  baseUrl: string = process.env.CHESSCOM_BASE_URL ?? DEFAULT_BASE_URL,
): PlatformClient {
  const root = baseUrl.replace(/\/$/, "");
  return {
    async fetchPlayer(username): Promise<PlatformAccount | null> {
      const res = await fetch(`${root}/pub/player/${encodeURIComponent(username)}`);
      if (res.status === 404) return null; // chess.com does not know this account
      if (!res.ok) throw new Error(`chess.com request failed (${res.status})`);
      const body = (await res.json()) as { username?: string; url?: string };
      return { username: canonicalUsername(body) ?? username };
    },
    async fetchMonth(username, year, month): Promise<MonthFetch> {
      const mm = String(month).padStart(2, "0");
      const res = await fetch(
        `${root}/pub/player/${encodeURIComponent(username)}/games/${year}/${mm}`,
      );
      // No archive that month is not a failure: chess.com simply has nothing.
      if (res.status === 404) return { totalFetched: 0, games: [] };
      if (!res.ok) throw new Error(`chess.com request failed (${res.status})`);
      const body = (await res.json()) as { games?: ChessComGame[] };
      return toMonthFetch(body.games ?? [], username);
    },
  };
}
