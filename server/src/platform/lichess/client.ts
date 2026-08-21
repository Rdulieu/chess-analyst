import type { MonthFetch, PlatformAccount, PlatformClient } from "../types";
import { discard, lichessGet, readNdjson, readText } from "./request";
import { isInScope, monthWindow, toImportedGame } from "./mapping";
import type { LichessGame } from "./payload";

/**
 * The Lichess adapter, answering the `PlatformClient` port's shapes (ADR-0016)
 * — nothing above it ever sees a Lichess payload. `baseUrl` is configurable
 * (env `LICHESS_BASE_URL`, default the live API), mirroring the chess.com
 * adapter, so tests and the agentic Feature Path can point it at a fixture.
 *
 * **No token.** The export is served anonymously; a token would only raise
 * throughput, and adding one later is an `Authorization` header here, with no
 * change to the port.
 */

const DEFAULT_BASE_URL = "https://lichess.org";

/** What Lichess answers about an account (the fields we read). */
interface LichessUser {
  username?: string;
  /** Set when the account has been closed. */
  disabled?: boolean;
}

export function createHttpLichessClient(
  baseUrl: string = process.env.LICHESS_BASE_URL ?? DEFAULT_BASE_URL,
): PlatformClient {
  const root = baseUrl.replace(/\/$/, "");
  return {
    async fetchPlayer(username): Promise<PlatformAccount | null> {
      const { status, body } = await lichessGet(
        `${root}/api/user/${encodeURIComponent(username)}`,
        { accept: "application/json" },
      );
      if (status === 404) {
        discard(body); // Lichess does not know this account
        return null;
      }
      if (status < 200 || status >= 300) {
        discard(body);
        throw new Error(`Lichess request failed (${status})`);
      }
      const user = JSON.parse(await readText(body)) as LichessUser;
      // A closed account is reported as **non-existent**: it will never hold a
      // Game to import, and "not found" is the answer a Player can act on.
      if (user.disabled === true) return null;
      // Lichess answers the canonical spelling directly, unlike chess.com where
      // it has to be read off a profile URL.
      return { username: user.username ?? username };
    },

    async fetchMonth(username, year, month): Promise<MonthFetch> {
      // The month is OUR unit (ADR-0016). Lichess could stream a whole range in
      // one request; we deliberately ask month by month, because the month is
      // what makes progress countable and a failure local. Months are never
      // fetched in parallel either — already true for memory (ADR-0010), and now
      // also what keeps us inside Lichess's "one request at a time" rule.
      const { since, until } = monthWindow(year, month);
      const query = new URLSearchParams({
        since: String(since),
        until: String(until),
        // Both are what spare us a second request and a classification of our
        // own (ADR-0007's amendment).
        pgnInJson: "true",
        opening: "true",
        sort: "dateAsc",
      });
      const { status, body } = await lichessGet(
        `${root}/api/games/user/${encodeURIComponent(username)}?${query}`,
        { accept: "application/x-ndjson" },
      );
      if (status < 200 || status >= 300) {
        discard(body);
        throw new Error(`Lichess request failed (${status})`);
      }

      let totalFetched = 0;
      const games = [];
      for await (const line of readNdjson(body)) {
        const game = line as LichessGame;
        // `totalFetched` says what Lichess HAD, out-of-scope games included, so
        // a month mostly out of scope never reads as an empty one.
        totalFetched++;
        if (isInScope(game)) games.push(toImportedGame(game, username));
      }
      return { totalFetched, games };
    },
  };
}
