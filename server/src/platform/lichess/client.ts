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
import { monthOfCreatedAt, monthOrdinal, monthsInRange } from "../months";
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
 * How long to wait after a `429` before replaying the export, **once**.
 *
 * A `429` from Lichess is an *instruction*, not a failure, which is why
 * ADR-0010's deliberate no-retry rule does not apply to it: treated as a month
 * failure it would cascade — month 3 failing, then 4 to 60 too, each on its own
 * line — while we keep hammering an API that just said no. One wait, one replay;
 * a second `429` is an ordinary month failure and the existing per-month
 * tolerance takes over.
 *
 * The minute comes from Lichess's documentation, not from measurement. The
 * `429`s we have actually produced look like a **per-IP throttle keyed to a
 * recent burst** (see ./request.ts) rather than a steady rate limit — and this
 * slice removes the burst, so a `429` on a nominal import should now be rare
 * enough that meeting one is itself worth reading as news.
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
     * **One request for the whole range** — the payoff of US-17. The export has
     * a range endpoint, so the month stops being what is *fetched* and stays
     * only what is *reported*: coverage is read off the Games themselves, in
     * date order, rather than off the requests.
     *
     * The stream is `sort=dateAsc`, so a Game dated in March is proof that
     * January and February are **behind us** — that is what closes them, at
     * zero if nothing came for them. A month the Player was inactive in
     * therefore still reads as a plain zero, which is the assertion this whole
     * story must not break (`CONTEXT.md`, `Monthly import`): a gap in the
     * history stays distinguishable from a gap in the fetching.
     *
     * A cut stream fails **every month still open**, and there is no carrying
     * on: with one request there is no next request to make. The Games that
     * arrived were already yielded, so nothing is lost — the failed months say
     * what has to be re-run.
     */
    async *fetchRange(username, from, to, hooks): AsyncGenerator<RangeEvent, void> {
      const months = monthsInRange(from, to);
      // The month awaiting its line, and what has been fetched toward it.
      let open = 0;
      let totalFetched = 0;
      try {
        for await (const fetched of exportRange(root, username, from, to, retryAfterMs, hooks)) {
          // Everything up to the month this Game belongs to is now behind us.
          while (open < months.length && monthOrdinal(months[open]) < monthOrdinal(fetched.month)) {
            yield { kind: "month-done", month: months[open], totalFetched };
            totalFetched = 0;
            open++;
          }
          // `totalFetched` says what Lichess HAD, out-of-scope games included,
          // so a month mostly out of scope never reads as an empty one.
          totalFetched++;
          if (fetched.game !== null) {
            yield { kind: "game", month: fetched.month, game: fetched.game };
          }
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        // Where it stopped, said once and separately: the month lines below say
        // WHAT is missing, this says WHERE to resume from. The month still open
        // is the one it died in — it is reported as failed, never as covered,
        // because we over-declare incompleteness (US-17-04).
        //
        // **Only a truncation.** A `429` or a `500` is refused before the first
        // byte: nothing was interrupted, there is no month it "died in", and
        // telling the Player where to resume would name a stop that never
        // happened. Those stay ordinary month failures.
        if (err instanceof TruncatedStreamError && open < months.length) {
          yield { kind: "stream-cut", month: months[open] };
        }
        // The month it died in carries what HAD arrived; the months after it
        // never got a byte. Only the adapter can say this — it is the only thing
        // that counted the lines, out-of-scope ones included.
        for (; open < months.length; open++) {
          yield { kind: "month-failed", month: months[open], reason, totalFetched };
          totalFetched = 0;
        }
        return;
      }
      // Whatever the stream never reached is covered, and empty.
      for (; open < months.length; open++) {
        yield { kind: "month-done", month: months[open], totalFetched };
        totalFetched = 0;
      }
    },
  };
}

/**
 * The range's export, **streamed**: yields each line's month together with the
 * in-scope Game, or `null` for a line that counts as fetched but is not ours to
 * study. The month is derived from the line itself — the only thing that can
 * say which month a Game counts toward now that the request no longer says it.
 *
 * Raises `TruncatedStreamError` when the body ends before the Platform finished.
 */
async function* exportRange(
  root: string,
  username: string,
  from: MonthRef,
  to: MonthRef,
  retryAfterMs: number,
  hooks?: FetchHooks,
): AsyncGenerator<{ month: MonthRef; game: ImportedGame | null }, void> {
  // One window over the whole span: the first month's opening instant to the
  // last month's closing one.
  const { since } = monthWindow(from.year, from.month);
  const { until } = monthWindow(to.year, to.month);
  const query = new URLSearchParams({
    since: String(since),
    until: String(until),
    // Both are what spare us a second request and a classification of our own
    // (ADR-0007's amendment).
    pgnInJson: "true",
    opening: "true",
    // Not a preference: month coverage is DERIVED from this order.
    sort: "dateAsc",
  });
  const { status, body } = await exportGames(
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
      yield {
        month: monthOfCreatedAt(game.createdAt),
        game: isInScope(game) ? toImportedGame(game, username) : null,
      };
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
async function exportGames(url: string, retryAfterMs: number, hooks?: FetchHooks) {
  const first = await lichessGet(url, { accept: "application/x-ndjson" });
  if (first.status !== 429) return first;
  discard(first.body);
  // Said out loud, because a silent minute is indistinguishable from a freeze.
  // The delay is stated from the actual wait rather than spelled "one minute":
  // it is configurable, and a message that named the wrong duration would be a
  // small lie in the one place the Player is being asked to trust us and sit.
  hooks?.onWaiting?.(
    `${platformLabel("lichess")} demande d'attendre : reprise de la plage dans ${Math.round(
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
