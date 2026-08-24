import { monthsInRange } from "../months";
import type {
  MonthFetch,
  MonthRef,
  PlatformAccount,
  PlatformClient,
  RangeEvent,
} from "../types";
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
    /**
     * **The month loop lives here now.** chess.com has no range endpoint — one
     * monthly archive is one request — so asking it for a range means asking it
     * month by month, exactly as before: same URLs, same order, same count. What
     * changed is only where that loop is written: inside the adapter, where it
     * describes chess.com, instead of above the port, where it constrained every
     * Platform (ADR-0018, as amended).
     *
     * A month that fails is reported as a failed month and the loop **carries
     * on**: one unanswerable month has never aborted an Import (ADR-0010), and
     * now that the loop is in here, only in here can that be honoured.
     */
    async *fetchRange(username, from, to): AsyncGenerator<RangeEvent, void> {
      for (const month of monthsInRange(from, to)) {
        let fetched;
        try {
          fetched = await fetchOneMonth(root, username, month);
        } catch (err) {
          yield {
            kind: "month-failed",
            month,
            reason: err instanceof Error ? err.message : String(err),
            // Always zero here: chess.com serves a month as one archive, so a
            // month that failed delivered nothing. It is stated rather than
            // omitted so the port has no optional field to forget.
            totalFetched: 0,
          };
          continue;
        }
        for (const game of fetched.games) yield { kind: "game", month, game };
        // Last, and always: the month's line is drawn on this event, and
        // `totalFetched` is what chess.com HAD, out-of-scope games included.
        yield { kind: "month-done", month, totalFetched: fetched.totalFetched };
      }
    },
  };
}

/** One monthly archive, in our vocabulary. Absent is not a failure — it is zero. */
async function fetchOneMonth(
  root: string,
  username: string,
  { year, month }: MonthRef,
): Promise<MonthFetch> {
  const mm = String(month).padStart(2, "0");
  const res = await fetch(`${root}/pub/player/${encodeURIComponent(username)}/games/${year}/${mm}`);
  // No archive that month is not a failure: chess.com simply has nothing.
  if (res.status === 404) return { totalFetched: 0, games: [] };
  if (!res.ok) throw new Error(`chess.com request failed (${res.status})`);
  const body = (await res.json()) as { games?: ChessComGame[] };
  return toMonthFetch(body.games ?? [], username);
}
