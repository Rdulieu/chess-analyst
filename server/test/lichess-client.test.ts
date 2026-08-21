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
