import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { AddressInfo } from "node:net";
import { createHttpLichessClient } from "../src/platform/lichess/client";
import { collectMonth } from "./fixtures";
import type { MonthRef, PlatformClient } from "../src/platform";

/**
 * A tiny stand-in for the Lichess API, so the real client is exercised end to
 * end (URL building, JSON parsing, 404 handling, the disabled account) without
 * any external network. `Metalyst` exists — spelled that way whatever casing is
 * asked; `ghost` does not; `closed` exists but is **disabled**.
 */

let server: Server;
let baseUrl: string;
/** Every export request the stand-in received, so the query can be asserted. */
const exportCalls: { username: string; query: Record<string, unknown> }[] = [];

/** A game as the ndjson export serves it. */
const game = (over: Record<string, unknown> = {}) => ({
  id: "abcd1234",
  speed: "blitz",
  variant: "standard",
  createdAt: Date.UTC(2024, 0, 15),
  winner: "white",
  players: { white: { user: { name: "Metalyst" } }, black: { user: { name: "opp" } } },
  opening: { eco: "B22", name: "Sicilian Defense: Alapin Variation" },
  pgn: "1. e4 c5 2. c3",
  ...over,
});

beforeAll(async () => {
  const app = express();
  app.get("/api/user/:username", (req, res) => {
    const asked = req.params.username.toLowerCase();
    // Lichess answers the canonical spelling in `username` directly — no URL to
    // read it off, unlike chess.com.
    if (asked === "metalyst") res.json({ id: "metalyst", username: "Metalyst" });
    else if (asked === "closed") res.json({ id: "closed", username: "Closed", disabled: true });
    else res.status(404).json({ error: "Not found" });
  });
  // A month whose every game is out of scope: a variant, a game from an
  // arbitrary position, and a game against the computer.
  app.get("/api/games/user/excluded", (_req, res) => {
    const lines = [
      game({ id: "wild01", variant: "atomic" }),
      game({ id: "fen001", initialFen: "8/8/8/8/8/8/8/K6k w - - 0 1" }),
      game({
        id: "stock1",
        players: { white: { user: { name: "Metalyst" } }, black: { aiLevel: 6 } },
      }),
    ];
    res.type("application/x-ndjson");
    res.send(lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  });
  /**
   * A correspondence game **straddling a month boundary**: started 2024-08-27,
   * finished in September. The real API filters on the START, so August's window
   * returns it and September's does not — the stand-in mirrors that exactly,
   * because it is the property the date choice depends on.
   */
  const STRADDLING = game({
    id: "strad01",
    speed: "correspondence",
    createdAt: Date.UTC(2024, 7, 27, 22, 0),
  });
  app.get("/api/games/user/straddler", (req, res) => {
    const since = Number(req.query.since);
    const until = Number(req.query.until);
    const lines = [STRADDLING].filter((g) => g.createdAt >= since && g.createdAt <= until);
    res.type("application/x-ndjson");
    res.send(lines.map((l) => JSON.stringify(l)).join("\n"));
  });

  /** Answers 429 as many times as `throttleFor` still counts down, then 200. */
  let throttleFor = 0;
  const throttled: number[] = [];
  app.get("/api/games/user/throttled", (_req, res) => {
    throttled.push(Date.now());
    if (throttleFor > 0) {
      throttleFor--;
      res.status(429).json({ error: "Too Many Requests" });
      return;
    }
    res.type("application/x-ndjson");
    res.send(JSON.stringify(game({ id: "after429" })));
  });
  app.get("/__throttle/:times", (req, res) => {
    throttleFor = Number(req.params.times);
    throttled.length = 0;
    res.json({ ok: true, attempts: throttled.length });
  });
  app.get("/__attempts", (_req, res) => res.json({ attempts: throttled.length }));

  /** A Platform that is simply failing — counted, so no retry can hide. */
  const brokenCalls: number[] = [];
  app.get("/api/games/user/broken", (_req, res) => {
    brokenCalls.push(Date.now());
    res.status(500).json({ error: "Internal Server Error" });
  });
  app.get("/__broken-calls", (_req, res) => res.json({ calls: brokenCalls.length }));

  /**
   * A stream **cut mid-body**: one whole game, then half of the next line, then
   * the socket destroyed. Served chunked (no `Content-Length`), exactly like the
   * real export — so the premature end is something the client can notice.
   */
  app.get("/api/games/user/truncated", (_req, res) => {
    res.type("application/x-ndjson");
    res.flushHeaders();
    res.write(JSON.stringify(game({ id: "arrived1" })) + "\n");
    res.write('{"id":"cutoff","spe');
    // Destroyed only once the bytes are actually on the wire: killing it sooner
    // is a connect-level reset, not the mid-body cut this is about. Not
    // res.end() — a chunked body abandoned without its terminating chunk is what
    // a dropped connection really looks like.
    setTimeout(() => res.socket?.destroy(), 50);
  });

  /**
   * The nastier cut: the socket dies **exactly on a line boundary**, so nothing
   * partial is left over. This is the case a tail-parse cannot catch — the
   * reader simply runs out of chunks and returns, and the month reads as a clean
   * (short) success.
   */
  app.get("/api/games/user/truncated-clean", (_req, res) => {
    res.type("application/x-ndjson");
    res.flushHeaders();
    res.write(JSON.stringify(game({ id: "arrived1" })) + "\n");
    setTimeout(() => res.socket?.destroy(), 50);
  });

  /**
   * A range stream cut **after crossing a month boundary**: a January game, a
   * March game, then the socket dies. The months the Games proved past are
   * settled; the rest never got its answer.
   */
  app.get("/api/games/user/truncated-span", (_req, res) => {
    res.type("application/x-ndjson");
    res.flushHeaders();
    res.write(JSON.stringify(game({ id: "jan01", createdAt: Date.UTC(2024, 0, 5) })) + "\n");
    res.write(JSON.stringify(game({ id: "mar01", createdAt: Date.UTC(2024, 2, 11) })) + "\n");
    setTimeout(() => res.socket?.destroy(), 50);
  });

  /**
   * An account with a real history: games in January and March 2024, **nothing
   * in February**. Filters on `since`/`until` exactly like the real export, and
   * serves in `dateAsc` order — the two properties deriving month coverage from
   * the Games depends on.
   */
  const SPANNING = [
    game({ id: "jan01", createdAt: Date.UTC(2024, 0, 5) }),
    game({ id: "jan02", createdAt: Date.UTC(2024, 0, 20), speed: "ultraBullet" }),
    // Counted as fetched in March, never a Game: a month can be busy and still
    // keep nothing, and that must not read as an empty one.
    game({ id: "mar99", createdAt: Date.UTC(2024, 2, 3), variant: "chess960" }),
    game({ id: "mar01", createdAt: Date.UTC(2024, 2, 11) }),
  ];
  app.get("/api/games/user/spanning", (req, res) => {
    exportCalls.push({ username: "spanning", query: req.query });
    const since = Number(req.query.since);
    const until = Number(req.query.until);
    const lines = SPANNING.filter((g) => g.createdAt >= since && g.createdAt <= until);
    res.type("application/x-ndjson");
    res.send(lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
  });

  app.get("/api/games/user/:username", (req, res) => {
    exportCalls.push({ username: req.params.username, query: req.query });
    // ndjson: one JSON document per line, which is exactly why the body cannot
    // be parsed as a single one.
    const lines = [
      game(),
      game({ id: "ultra1", speed: "ultraBullet", winner: undefined }),
      // A variant, served like any other game: counted as fetched, never a Game.
      game({ id: "wild99", variant: "chess960" }),
    ];
    res.type("application/x-ndjson");
    // A trailing newline and a stray blank line: both are ordinary in a stream,
    // and neither may become a parse error.
    res.send(lines.map((l) => JSON.stringify(l)).join("\n") + "\n\n");
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe("the Lichess adapter's account lookup", () => {
  it("answers an account with the casing Lichess itself spells it in", async () => {
    // The whole point of asking rather than trusting what was typed: `metalyst`
    // and `METALYST` must come back as the one spelling `Metalyst`, so one
    // account cannot become two Profiles (ADR-0014).
    const client = createHttpLichessClient(baseUrl);

    await expect(client.fetchPlayer("metalyst")).resolves.toEqual({ username: "Metalyst" });
    await expect(client.fetchPlayer("METALYST")).resolves.toEqual({ username: "Metalyst" });
  });

  it("tells an unknown account apart from a Lichess it could not reach", async () => {
    // Two different answers on purpose: the first is the Player's typo, the
    // second is nobody's fault — and only the first should ever read as one.
    const client = createHttpLichessClient(baseUrl);
    await expect(client.fetchPlayer("ghost")).resolves.toBeNull();

    const unreachable = createHttpLichessClient("http://127.0.0.1:1");
    await expect(unreachable.fetchPlayer("metalyst")).rejects.toThrow();
  });

  it("treats a closed account as non-existent — it will never hold a Game to import", async () => {
    // Lichess answers 200 for a disabled account. Reported as "unreachable" it
    // would send the Player looking for a network problem; reported as existing
    // it would create a Profile that can never fill. "Not found" is the answer
    // they can act on.
    const client = createHttpLichessClient(baseUrl);

    await expect(client.fetchPlayer("closed")).resolves.toBeNull();
  });
});

describe("the Lichess adapter's month fetch", () => {
  it("reads the ndjson stream line by line and answers our shapes", async () => {
    const client = createHttpLichessClient(baseUrl);

    const month = await collectMonth(client, "Metalyst", 2024, 1);

    // Everything the Platform returned is "fetched", the variant included; only
    // what we study is handed over.
    expect(month.totalFetched).toBe(3);
    expect(month.games.map((g) => g.gameUrl)).toEqual([
      "https://lichess.org/abcd1234",
      "https://lichess.org/ultra1",
    ]);
    expect(month.games[0]).toMatchObject({
      opponent: "opp",
      playerColor: "white",
      result: "win",
      date: "2024-01-15",
      timeControlCategory: "blitz",
      eco: "B22",
    });
    expect(month.games[1]).toMatchObject({ timeControlCategory: "bullet", result: "draw" });
  });

  it("asks for the month as a UTC instant window, with the PGN and the opening included", async () => {
    exportCalls.length = 0;
    const client = createHttpLichessClient(baseUrl);

    await collectMonth(client, "Metalyst", 2024, 2);

    expect(exportCalls).toHaveLength(1);
    const { username, query } = exportCalls[0];
    expect(username).toBe("Metalyst");
    expect(Number(query.since)).toBe(Date.UTC(2024, 1, 1));
    expect(Number(query.until)).toBe(Date.UTC(2024, 2, 1) - 1);
    // Without these two the PGN and the Opening would have to come from
    // somewhere else — a second request, or a classification of our own.
    expect(query.pgnInJson).toBe("true");
    expect(query.opening).toBe("true");
  });
});

describe("a month Lichess answered, of which we keep nothing", () => {
  it("is covered with zero games kept, while still reporting what was fetched", async () => {
    // Not a failure and not an empty month: the Platform DID send games, they
    // are just not the ones we study. The summary showing fetched > imported is
    // what tells the Player that, instead of quietly narrowing the number.
    const client = createHttpLichessClient(baseUrl);

    const month = await collectMonth(client, "excluded", 2024, 1);

    expect(month.totalFetched).toBe(3);
    expect(month.games).toEqual([]);
  });
});

describe("a game straddling a month boundary", () => {
  it("is brought in by the month holding its START, and not by the following one", async () => {
    // The export filters on the start, so that is what the Game is dated by. Any
    // other choice would let a month fetch a Game and file it under another —
    // and importing that month alone would then miss it entirely, a hole no
    // re-import and no deduplication would ever reveal.
    const client = createHttpLichessClient(baseUrl);

    const august = await collectMonth(client, "straddler", 2024, 8);
    const september = await collectMonth(client, "straddler", 2024, 9);

    expect(august.games).toHaveLength(1);
    expect(august.games[0].date).toBe("2024-08-27");
    expect(september.games).toEqual([]);
  });
});

/** The retry is calibrated in minutes in production; here it must be instant. */
const withFastRetry = () => createHttpLichessClient(baseUrl, 5);

describe("a 429 from Lichess", () => {
  const arm = (times: number) => fetch(`${baseUrl}/__throttle/${times}`).then((r) => r.json());
  const attempts = async () =>
    (await fetch(`${baseUrl}/__attempts`).then((r) => r.json() as Promise<{ attempts: number }>))
      .attempts;

  it("is an instruction, not a failure: the month is waited on and replayed once", async () => {
    await arm(1);
    const client = withFastRetry();

    const month = await collectMonth(client, "throttled", 2024, 1);

    expect(month.games.map((g) => g.gameUrl)).toEqual(["https://lichess.org/after429"]);
    expect(await attempts()).toBe(2); // the refusal, then the replay
  });

  it("says it is waiting, so a minute of silence does not read as a freeze", async () => {
    await arm(1);
    const said: string[] = [];
    const client = withFastRetry();

    await collectMonth(client, "throttled", 2024, 1, { onWaiting: (m) => said.push(m) });

    expect(said).toHaveLength(1);
    expect(said[0]).toMatch(/lichess\.org/i);
  });

  it("names the RANGE as what resumes, not the month", async () => {
    // There is one request for the whole span now, so what the wait holds up is
    // the range. Saying "reprise du mois" would misname it — and would tell a
    // Player watching a 71-month import that one month of it is being retried.
    await arm(1);
    const said: string[] = [];

    await collectMonth(withFastRetry(), "throttled", 2024, 1, {
      onWaiting: (m) => said.push(m),
    });

    expect(said[0]).toMatch(/plage/i);
    expect(said[0]).not.toMatch(/du mois/i);
  });

  it("gives up after a second refusal, as an ordinary month failure — no hammering", async () => {
    // ADR-0010's no-retry rule is deliberate; this is the one exception, and it
    // stays one replay. A second 429 hands the month back to the existing
    // tolerance rather than looping.
    await arm(2);
    const client = withFastRetry();

    await expect(collectMonth(client, "throttled", 2024, 1)).rejects.toThrow(/429/);
    expect(await attempts()).toBe(2);
  });

  it("does not retry anything that is not a 429", async () => {
    // A 500 is not an instruction to wait: retrying it would double the load on
    // a Platform that is already failing.
    const client = withFastRetry();

    await expect(collectMonth(client, "broken", 2024, 1)).rejects.toThrow(/500/);

    const { calls } = (await fetch(`${baseUrl}/__broken-calls`).then((r) => r.json())) as {
      calls: number;
    };
    expect(calls).toBe(1);
  });
});

/** Every event of a one-month range, in order. */
async function eventsFor(client: PlatformClient, username: string, month: number) {
  const events = [];
  for await (const e of client.fetchRange(username, { year: 2024, month }, { year: 2024, month })) {
    events.push(e);
  }
  return events;
}

describe("a truncated games stream", () => {
  it("fails the month instead of quietly ending it as covered", async () => {
    // The hole this closes: the reader stops yielding when the body dies
    // mid-flight, so a half-imported month would be indistinguishable from a
    // month the Player was inactive in. Silence here becomes a permanent,
    // invisible gap in the history.
    const client = createHttpLichessClient(baseUrl);

    const events = await eventsFor(client, "truncated", 1);

    expect(events.map((e) => e.kind)).not.toContain("month-done");
    expect(events.at(-1)).toMatchObject({
      kind: "month-failed",
      month: { year: 2024, month: 1 },
    });
  });

  it("fails the month even when the cut lands exactly on a line boundary", async () => {
    // Nothing partial is left to fail a parse, so detecting this cannot rest on
    // the leftovers: the stream itself has to be known to have ended early.
    const client = createHttpLichessClient(baseUrl);

    const events = await eventsFor(client, "truncated-clean", 1);

    expect(events.map((e) => e.kind)).not.toContain("month-done");
    expect(events.at(-1)).toMatchObject({ kind: "month-failed" });
  });

  it("has already yielded the games that arrived, so nothing is lost with the break", async () => {
    // They come through BEFORE the failure — which is why nothing has to carry
    // them any more. A re-run costs nothing (dedup by URL), but a Game silently
    // dropped here is one the Player never gets back.
    const client = createHttpLichessClient(baseUrl);

    const events = await eventsFor(client, "truncated", 1);

    const games = events.filter((e) => e.kind === "game");
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({ game: { gameUrl: "https://lichess.org/arrived1" } });
    expect(events.indexOf(games[0])).toBeLessThan(events.length - 1);
  });

  it("says the stream ended early, in words a Player can act on", async () => {
    // What lands on the month's line. `aborted` — Node's own word — names a
    // socket, not a thing the Player can do; the message has to say the answer
    // was cut short and that re-running is the way out.
    const client = createHttpLichessClient(baseUrl);

    const events = await eventsFor(client, "truncated", 1);

    expect(events.at(-1)).toMatchObject({
      kind: "month-failed",
      reason: expect.stringMatching(/interrompu|incomplet/i),
    });
  });

  it("carries on to the next month rather than ending the range", async () => {
    // One unanswerable month has never aborted an Import (ADR-0010). Now that
    // the month loop is inside the adapter, only the adapter can honour that.
    const client = createHttpLichessClient(baseUrl);

    const events = [];
    for await (const e of client.fetchRange(
      "truncated",
      { year: 2024, month: 1 },
      { year: 2024, month: 2 },
    )) {
      events.push(e);
    }

    expect(events.filter((e) => e.kind === "month-failed")).toHaveLength(2);
  });
});

describe("a Lichess range", () => {
  /** Every event of a range, in order. */
  const eventsOver = async (username: string, from: MonthRef, to: MonthRef) => {
    const events = [];
    for await (const e of createHttpLichessClient(baseUrl).fetchRange(username, from, to)) {
      events.push(e);
    }
    return events;
  };

  it("is asked for in a single export request, whatever the number of months", async () => {
    // The whole payoff of US-17: 71 requests became one. The month stays the
    // unit of REPORTING and stops being the unit of FETCHING — so this count
    // must not follow the length of the range.
    exportCalls.length = 0;

    await eventsOver("spanning", { year: 2024, month: 1 }, { year: 2024, month: 4 });

    expect(exportCalls).toHaveLength(1);
    const { query } = exportCalls[0];
    expect(Number(query.since)).toBe(Date.UTC(2024, 0, 1));
    expect(Number(query.until)).toBe(Date.UTC(2024, 4, 1) - 1);
    // Still ordered, because coverage is read off the Games in date order.
    expect(query.sort).toBe("dateAsc");
  });
  it("still draws one line per month, the empty ones at zero", async () => {
    // The assertion the whole story must not break: a month the Player was
    // inactive in reads as a plain zero, so a gap in the HISTORY stays
    // distinguishable from a gap in the FETCHING. February was never asked for
    // on its own any more — it is covered because a March Game proved it past.
    const events = await eventsOver("spanning", { year: 2024, month: 1 }, { year: 2024, month: 4 });

    expect(events.filter((e) => e.kind !== "game")).toEqual([
      { kind: "month-done", month: { year: 2024, month: 1 }, totalFetched: 2 },
      { kind: "month-done", month: { year: 2024, month: 2 }, totalFetched: 0 },
      // Two fetched, one kept: the variant counts as fetched, so a busy month
      // that yields nothing never reads as an empty one.
      { kind: "month-done", month: { year: 2024, month: 3 }, totalFetched: 2 },
      // Past the last Game, and still covered — not omitted, not failed.
      { kind: "month-done", month: { year: 2024, month: 4 }, totalFetched: 0 },
    ]);
  });

  it("tags each Game with the month it counts toward, in date order", async () => {
    const events = await eventsOver("spanning", { year: 2024, month: 1 }, { year: 2024, month: 4 });

    expect(events.filter((e) => e.kind === "game").map((e) => [e.month.month, e.game.gameUrl]))
      .toEqual([
        [1, "https://lichess.org/jan01"],
        [1, "https://lichess.org/jan02"],
        [3, "https://lichess.org/mar01"],
      ]);
  });
  it("keeps the months a Game proved past when the stream is cut, and fails only the rest", async () => {
    // With one request there is no next request to carry on to, so a cut has to
    // say WHERE it stopped. January and February were settled by the March Game
    // arriving — re-failing them would send the Player back over months that
    // were answered in full. March and April never got their answer.
    const events = await eventsOver(
      "truncated-span",
      { year: 2024, month: 1 },
      { year: 2024, month: 4 },
    );

    expect(events.filter((e) => e.kind !== "game")).toEqual([
      { kind: "month-done", month: { year: 2024, month: 1 }, totalFetched: 1 },
      { kind: "month-done", month: { year: 2024, month: 2 }, totalFetched: 0 },
      {
        kind: "month-failed",
        month: { year: 2024, month: 3 },
        reason: expect.stringMatching(/interrompu|incomplet/i),
      },
      {
        kind: "month-failed",
        month: { year: 2024, month: 4 },
        reason: expect.stringMatching(/interrompu|incomplet/i),
      },
    ]);
    // And both Games are through before any of it — nothing is lost with the cut.
    expect(events.filter((e) => e.kind === "game")).toHaveLength(2);
  });
});
