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
