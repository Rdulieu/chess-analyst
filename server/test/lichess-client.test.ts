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
