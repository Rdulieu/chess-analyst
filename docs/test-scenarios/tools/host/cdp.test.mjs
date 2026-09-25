import { describe, it, expect, afterEach } from "vitest";

import { attach } from "./cdp.mjs";

/*
 * What happens when the socket stops answering.
 *
 * Measured on the run of 2026-08-31: mid-pass the websocket wedged with Chrome and
 * the app both alive and answering HTTP. Every later `Runtime.evaluate` hung
 * **forever**, and so did the teardown — `stop()` awaits `close()`, which awaited a
 * `close` event that was never coming. The run had to be SIGKILLed, which is exactly
 * how a port is left orphaned for the next run to trip over.
 *
 * These two tests are the difference between a hang and an error. A fake socket is
 * used rather than a browser: the point is the transport's behaviour when it dies,
 * and a real Chrome cannot be asked to die that way on demand.
 */

/** A socket that opens, answers the handshake, and then goes silent for ever. */
class DeafSocket {
  constructor() {
    this.listeners = {};
    this.answering = true;
    queueMicrotask(() => this.emit("open", {}));
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  emit(type, event) {
    for (const fn of this.listeners[type] || []) fn(event);
  }
  send(raw) {
    if (!this.answering) return; // the wedge: the write succeeds, the answer never comes
    const { id } = JSON.parse(raw);
    queueMicrotask(() => this.emit("message", { data: JSON.stringify({ id, result: {} }) }));
  }
  close() {
    /* Deliberately fires nothing. A wedged socket does not emit `close`, and a
       teardown that waits for one waits for ever. */
  }
}

const original = globalThis.WebSocket;
afterEach(() => {
  globalThis.WebSocket = original;
});

async function deafSession() {
  const made = [];
  globalThis.WebSocket = function FakeSocket() {
    const socket = new DeafSocket();
    made.push(socket);
    return socket;
  };
  const session = await attach("ws://127.0.0.1:0/fake");
  return { session, socket: made[0] };
}

describe("a socket that stops answering", () => {
  it("fails the call with what happened, rather than hanging for ever", async () => {
    const { session, socket } = await deafSession();
    socket.answering = false;

    await expect(session.send("Runtime.evaluate", {}, { timeoutMs: 40 })).rejects.toThrow(
      /wedged, not slow/,
    );
  });

  it("lets the teardown finish anyway — a stop nobody can await leaves an app behind", async () => {
    const { session, socket } = await deafSession();
    socket.answering = false;

    // No `close` event will ever arrive. Giving up is a normal outcome here: the
    // caller kills the browser next either way, and a teardown that cannot return
    // is how a run ends up SIGKILLed with its ports still held.
    await expect(session.close({ timeoutMs: 40 })).resolves.toBeUndefined();
  });

  it("still resolves normally while the socket is alive", async () => {
    const { session } = await deafSession();
    await expect(session.send("Page.enable")).resolves.toEqual({});
  });
});

describe("a request that has been out longer than the staleness guard", () => {
  /*
   * `pendingRequests` ignores anything out for more than `staleMs`, so a stream
   * cannot hold a walk hostage. Right, and it made a **legitimate** 12 s fold
   * indistinguishable from a stream: `/api/stats/replay` measured up to 57.5 s
   * on `Nonomoho` (US-32 slice 08), and the walk read the network as quiet.
   *
   * The guard stays. What it may not do is stay silent: a caller that gives up
   * has to be able to say the network was not quiet, it was **dropped as stale**.
   */
  const withInflight = async () => {
    const { session, socket } = await deafSession();
    socket.emit("message", {
      data: JSON.stringify({ method: "Network.requestWillBeSent", params: { requestId: "r1" } }),
    });
    /* No sleep: the ageing is done by passing `staleMs = 0` at the call site, so
       every request is older than the window by construction. */
    return { session, socket };
  };

  it("still counts a fresh request as in flight", async () => {
    const { session } = await withInflight();
    expect(session.pendingRequests()).toBe(1);
    expect(session.staleRequests()).toBe(0);
  });

  it("stops counting one that outlived the window — and reports it as stale instead", async () => {
    const { session } = await withInflight();
    // A window of zero makes every request older than it, without a sleep.
    expect(session.pendingRequests(0)).toBe(0);
    expect(session.staleRequests(0)).toBe(1);
  });

  it("counts nothing as stale once the request has finished", async () => {
    const { session, socket } = await withInflight();
    socket.emit("message", {
      data: JSON.stringify({ method: "Network.loadingFinished", params: { requestId: "r1" } }),
    });
    expect(session.pendingRequests(0)).toBe(0);
    expect(session.staleRequests(0)).toBe(0);
  });
});
