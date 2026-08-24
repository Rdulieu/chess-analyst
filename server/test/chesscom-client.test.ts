import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import type { Server } from "node:http";
import { AddressInfo } from "node:net";
import { createHttpChessComClient } from "../src/platform/chesscom/client";
import { collectMonth } from "./fixtures";

/**
 * A tiny stand-in for chess.com's public API, so the real fetch-based client is
 * exercised end to end (URL building, JSON parsing, 404 handling) without any
 * external network. "known" has one archive for 2024/01; "ghost" does not exist.
 */
const ARCHIVE = {
  games: [
    {
      url: "https://www.chess.com/game/live/42",
      pgn: "1. e4 e5",
      time_class: "blitz",
      rules: "chess",
      end_time: 1704067200,
      white: { username: "known", result: "win" },
      black: { username: "opp", result: "resigned" },
    },
  ],
};

let server: Server;
let baseUrl: string;
/** Every monthly-archive request the stand-in received, in order. */
const archiveCalls: string[] = [];

beforeAll(async () => {
  const app = express();
  app.get("/pub/player/:username", (req, res) => {
    // chess.com answers the username LOWERCASED and carries the member's own
    // casing in `url` — which is why the canonical spelling is read off there.
    if (req.params.username.toLowerCase() === "known") {
      res.json({ username: "known", url: "https://www.chess.com/member/KnoWn" });
    } else res.status(404).json({ code: 0, message: "not found" });
  });
  app.get("/pub/player/:username/games/:year/:month", (req, res) => {
    archiveCalls.push(`${req.params.username}/${req.params.year}/${req.params.month}`);
    if (
      req.params.username === "known" &&
      req.params.year === "2024" &&
      req.params.month === "01"
    ) {
      res.json(ARCHIVE);
    } else {
      res.status(404).json({ code: 0, message: "not found" });
    }
  });
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
});

describe("the chess.com adapter's HTTP client", () => {
  it("answers a month in OUR vocabulary, not chess.com's payload (ADR-0018)", async () => {
    const client = createHttpChessComClient(baseUrl);

    const month = await collectMonth(client, "known", 2024, 1);

    expect(month.totalFetched).toBe(1);
    expect(month.games).toHaveLength(1);
    expect(month.games[0]).toMatchObject({
      gameUrl: "https://www.chess.com/game/live/42",
      timeControlCategory: "blitz",
      opponent: "opp",
      playerColor: "white",
      result: "win",
      date: "2024-01-01",
    });
  });

  it("returns an empty month rather than throwing when the archive is absent", async () => {
    const client = createHttpChessComClient(baseUrl);

    await expect(collectMonth(client, "known", 2025, 12)).resolves.toEqual({
      totalFetched: 0,
      games: [],
    });
  });

  it("answers a player with the casing chess.com itself spells them in", async () => {
    // The whole point of asking chess.com rather than trusting what was typed:
    // `known` and `KNOWN` must come back as the one spelling `KnoWn`, so a
    // Profile cannot be created twice for one account (US-11, ADR-0014).
    const client = createHttpChessComClient(baseUrl);

    await expect(client.fetchPlayer("known")).resolves.toEqual({ username: "KnoWn" });
    await expect(client.fetchPlayer("KNOWN")).resolves.toEqual({ username: "KnoWn" });
  });

  it("tells an unknown account apart from a chess.com it could not reach", async () => {
    // Two different answers on purpose: the first is the user's typo, the second
    // is nobody's fault — and only the first should ever read as one.
    const client = createHttpChessComClient(baseUrl);
    await expect(client.fetchPlayer("ghost")).resolves.toBeNull();

    const unreachable = createHttpChessComClient("http://127.0.0.1:1/pub-does-not-listen");
    await expect(unreachable.fetchPlayer("known")).rejects.toThrow();
  });
});

describe("the chess.com adapter over a range", () => {
  it("keeps issuing one monthly-archive request per month, in order", async () => {
    // The month loop MOVED into the adapter; it did not disappear. chess.com has
    // no range endpoint, so the requests it makes must be exactly what they were
    // — same URLs, same order, same count (ADR-0018's amendment).
    archiveCalls.length = 0;
    const client = createHttpChessComClient(baseUrl);

    const events = [];
    for await (const event of client.fetchRange("known", { year: 2023, month: 12 }, { year: 2024, month: 2 })) {
      events.push(event);
    }

    expect(archiveCalls).toEqual(["known/2023/12", "known/2024/01", "known/2024/02"]);
    // One month-done per month of the range, in order, empty months included.
    expect(events.filter((e) => e.kind === "month-done").map((e) => e.month)).toEqual([
      { year: 2023, month: 12 },
      { year: 2024, month: 1 },
      { year: 2024, month: 2 },
    ]);
    // The one Game the stand-in has, tagged with the month it counts toward.
    const games = events.filter((e) => e.kind === "game");
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({
      month: { year: 2024, month: 1 },
      game: { gameUrl: "https://www.chess.com/game/live/42" },
    });
  });
});
