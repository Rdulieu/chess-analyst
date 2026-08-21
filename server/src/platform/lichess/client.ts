import type { MonthFetch, PlatformAccount, PlatformClient } from "../types";
import { discard, lichessGet, readText } from "./request";

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

    async fetchMonth(): Promise<MonthFetch> {
      // Slice 03 stops at existence: a Lichess Profile can be created, named and
      // selected. Fetching its months is the next slice, and until then this
      // fails **loudly** rather than reporting an empty month — a silent zero
      // would read as "you played nothing", which is a different claim.
      throw new Error("L'import Lichess n'est pas encore disponible.");
    },
  };
}
