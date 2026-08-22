import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { AddressInfo } from "node:net";
import { createHttpLichessClient } from "../src/platform/lichess/client";

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

    const month = await client.fetchMonth("Metalyst", 2024, 1);

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

    await client.fetchMonth("Metalyst", 2024, 2);

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

    const month = await client.fetchMonth("excluded", 2024, 1);

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

    const august = await client.fetchMonth("straddler", 2024, 8);
    const september = await client.fetchMonth("straddler", 2024, 9);

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

    const month = await client.fetchMonth("throttled", 2024, 1);

    expect(month.games.map((g) => g.gameUrl)).toEqual(["https://lichess.org/after429"]);
    expect(await attempts()).toBe(2); // the refusal, then the replay
  });

  it("says it is waiting, so a minute of silence does not read as a freeze", async () => {
    await arm(1);
    const said: string[] = [];
    const client = withFastRetry();

    await client.fetchMonth("throttled", 2024, 1, { onWaiting: (m) => said.push(m) });

    expect(said).toHaveLength(1);
    expect(said[0]).toMatch(/lichess\.org/i);
  });

  it("gives up after a second refusal, as an ordinary month failure — no hammering", async () => {
    // ADR-0010's no-retry rule is deliberate; this is the one exception, and it
    // stays one replay. A second 429 hands the month back to the existing
    // tolerance rather than looping.
    await arm(2);
    const client = withFastRetry();

    await expect(client.fetchMonth("throttled", 2024, 1)).rejects.toThrow(/429/);
    expect(await attempts()).toBe(2);
  });

  it("does not retry anything that is not a 429", async () => {
    // A 500 is not an instruction to wait: retrying it would double the load on
    // a Platform that is already failing.
    const client = withFastRetry();

    await expect(client.fetchMonth("broken", 2024, 1)).rejects.toThrow(/500/);

    const { calls } = (await fetch(`${baseUrl}/__broken-calls`).then((r) => r.json())) as {
      calls: number;
    };
    expect(calls).toBe(1);
  });
});
