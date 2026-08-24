import {
  platformLabel,
  TruncatedStreamError,
  type FetchHooks,
  type ImportedGame,
  type MonthRef,
  type PlatformAccount,
  type PlatformClient,
  type RangeEvent,
} from "../types";
import { monthsInRange } from "../months";
import { discard, lichessGet, readNdjson, readText } from "./request";
import { isInScope, monthWindow, toImportedGame } from "./mapping";
import type { LichessGame } from "./payload";

/**
 * The Lichess adapter, answering the `PlatformClient` port's shapes (ADR-0018)
 * — nothing above it ever sees a Lichess payload. `baseUrl` is configurable
 * (env `LICHESS_BASE_URL`, default the live API), mirroring the chess.com
 * adapter, so tests and the agentic Feature Path can point it at a fixture.
 *
 * **No token.** The export is served anonymously; a token would only raise
 * throughput, and adding one later is an `Authorization` header here, with no
 * change to the port.
 */

const DEFAULT_BASE_URL = "https://lichess.org";

/**
 * How long to wait after a `429` before replaying the month, **once**.
 *
 * A `429` from Lichess is an *instruction*, not a failure, which is why
 * ADR-0010's deliberate no-retry rule does not apply to it: treated as a month
 * failure it would cascade — month 3 failing, then 4 to 60 too, each on its own
 * line — while we keep hammering an API that just said no. One wait, one replay;
 * a second `429` is an ordinary month failure and the existing per-month
 * tolerance takes over.
 *
 * The minute comes from Lichess's documentation, not from measurement: every
 * `429` we could actually produce was the IPv6 refusal (see ./request.ts), not a
 * genuine throttle. A real one should be used to revisit this.
 */
const RETRY_AFTER_MS = 60_000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** What Lichess answers about an account (the fields we read). */
interface LichessUser {
  username?: string;
  /** Set when the account has been closed. */
  disabled?: boolean;
}

export function createHttpLichessClient(
  baseUrl: string = process.env.LICHESS_BASE_URL ?? DEFAULT_BASE_URL,
  // Configurable for the same reason the base URL is: a Feature Path has to be
  // able to WATCH the wait, and a minute of it is not watchable.
  retryAfterMs: number = Number(process.env.LICHESS_RETRY_MS ?? RETRY_AFTER_MS),
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

    /**
     * **Still one request per month** — collapsing the range into a single
     * export is the next slice's whole point, and this one must not change any
     * request count. What changes here is that the Games are *yielded* as the
     * ndjson arrives instead of being piled into an array first: `readNdjson`
     * was already an `AsyncGenerator`, and `fetchMonth` was the thing breaking
     * the flow.
     *
     * A month whose stream is cut short is reported as a **failed month** and the
     * loop carries on. The Games that arrived have already been yielded — so they
     * are already kept, without anything having to carry them (slice 01 had to,
     * because the port materialised the month; it no longer does).
     */
    async *fetchRange(username, from, to, hooks): AsyncGenerator<RangeEvent, void> {
      for (const month of monthsInRange(from, to)) {
        let totalFetched = 0;
        try {
          for await (const fetched of exportOneMonth(root, username, month, retryAfterMs, hooks)) {
            // `totalFetched` says what Lichess HAD, out-of-scope games included,
            // so a month mostly out of scope never reads as an empty one.
            totalFetched++;
            if (fetched !== null) yield { kind: "game", month, game: fetched };
          }
        } catch (err) {
          yield {
            kind: "month-failed",
            month,
            reason: err instanceof Error ? err.message : String(err),
          };
          continue;
        }
        yield { kind: "month-done", month, totalFetched };
      }
    },
  };
}

/**
 * One month's export, **streamed**: yields the in-scope Game for each line, or
 * `null` for a line that counts as fetched but is not ours to study. Raises
 * `TruncatedStreamError` when the body ends before the Platform finished.
 */
async function* exportOneMonth(
  root: string,
  username: string,
  { year, month }: MonthRef,
  retryAfterMs: number,
  hooks?: FetchHooks,
): AsyncGenerator<ImportedGame | null, void> {
  // The month is still what is ASKED for here; that it need not be is slice 03.
  const { since, until } = monthWindow(year, month);
  const query = new URLSearchParams({
    since: String(since),
    until: String(until),
    // Both are what spare us a second request and a classification of our own
    // (ADR-0007's amendment).
    pgnInJson: "true",
    opening: "true",
    sort: "dateAsc",
  });
  const { status, body } = await exportMonth(
    `${root}/api/games/user/${encodeURIComponent(username)}?${query}`,
    retryAfterMs,
    hooks,
  );
  if (status < 200 || status >= 300) {
    discard(body);
    throw new Error(`Lichess request failed (${status})`);
  }
  try {
    for await (const line of readNdjson(body)) {
      const game = line as LichessGame;
      yield isInScope(game) ? toImportedGame(game, username) : null;
    }
  } catch (err) {
    // The stream died mid-body. Node raises here (`aborted`, ECONNRESET) —
    // measured, not assumed — but its word names a socket, not something the
    // Player can act on, so it is restated.
    if (isPrematureEnd(body, err)) throw new TruncatedStreamError("lichess");
    throw err;
  }
  // The iteration can also end cleanly on a boundary while the message was never
  // completed; `complete` is Node's own account of that.
  if (!body.complete) throw new TruncatedStreamError("lichess");
}

/**
 * The export request, with the one retry a `429` earns. Nothing else is
 * retried: a 500 is not an instruction to wait, and replaying it would only
 * double the load on a Platform that is already failing.
 */
async function exportMonth(url: string, retryAfterMs: number, hooks?: FetchHooks) {
  const first = await lichessGet(url, { accept: "application/x-ndjson" });
  if (first.status !== 429) return first;
  discard(first.body);
  // Said out loud, because a silent minute is indistinguishable from a freeze.
  // The delay is stated from the actual wait rather than spelled "one minute":
  // it is configurable, and a message that named the wrong duration would be a
  // small lie in the one place the Player is being asked to trust us and sit.
  hooks?.onWaiting?.(
    `${platformLabel("lichess")} demande d'attendre : reprise du mois dans ${Math.round(
      retryAfterMs / 1000,
    )} s.`,
  );
  await sleep(retryAfterMs);
  return lichessGet(url, { accept: "application/x-ndjson" });
}

/**
 * Whether this failure is the body ending early rather than a bad payload. A
 * `JSON.parse` blowing up on a line that arrived whole is a payload bug and must
 * keep surfacing as itself; an incomplete message is a truncation whatever the
 * error says.
 */
function isPrematureEnd(body: { complete: boolean }, err: unknown): boolean {
  return !body.complete || (err as { code?: string })?.code === "ECONNRESET";
}
