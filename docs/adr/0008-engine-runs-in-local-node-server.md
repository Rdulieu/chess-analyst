# The chess engine runs in the local Node server, behind a swappable Engine interface

> **Status:** accepted — **supersedes [ADR-0001](0001-stockfish-client-side-wasm.md)** (engine location).
> The remark below contrasting this pass with the *"network-bound Import"* no longer holds since
> [ADR-0010](0010-range-import-as-fault-tolerant-background-job.md): a range Import is long-running
> too and runs as a background job. The two passes remain separate operations.

US-4 needs engine `Evaluation`s to detect the player's `Inaccuracy`/`Mistake`/`Blunder`s and, from
those, `Danger position`s. ADR-0001 put Stockfish **client-side** (browser WASM) and rejected a
"server-hosted" engine as adding *"hosting, an API, and auth for no real benefit."* That rejection
targeted a **remote/hosted** backend — which does not apply here: this app's "server" is **the local
Node process the player already runs** (the relay), with an existing API and no auth (ADR-0002/0003).
So the ADR-0001 objections are moot, and running the engine server-side is both feasible and more
coherent with the existing model (all heavy compute is already server-side — `Move habit`
precompute, ADR-0005).

We therefore **run the engine inside the local Node server**, in a `worker_thread` (so a minutes-long
analysis never blocks the API), **behind an `Engine` interface** (UCI-shaped:
`evaluate(fen, limit) → { cp | mate, bestmove }`). The interface makes the *backend* a reversible,
isolated choice — the analysis / Mistake / Danger logic never depends on it:

- **Default backend: Stockfish WASM run in Node.** No native install (npm-only), same UCI protocol.
  In Node, `SharedArrayBuffer` is available without the COOP/COEP headers that pushed ADR-0001 to the
  single-threaded build in the browser, so the multi-threaded build is reachable here if wanted.
- **Opt-in backend: a native Stockfish binary** pointed at by `STOCKFISH_PATH`, driven over UCI via a
  child process — for greater depth/throughput. The *driver code is the same UCI client*; the only
  extra cost is provisioning the binary per platform, so it stays opt-in until distribution matters.
- **Test backend: an injected fake `Engine`** (mirrors the injected chess.com client, ADR-0002), so
  lower-tier tests are deterministic regardless of the real engine.

## Considered options

- **Keep the engine client-side (browser WASM), analysis as a separate client pass, results
  POSTed back to the server.** Honours ADR-0001, keeps the server dependency-light. Rejected: runs
  against the grain of ADR-0005 (compute at the store of record), round-trips computed evaluations,
  and caps at single-threaded WASM on the UI thread.
- **Native Stockfish as the sole/default backend.** Fastest/deepest, but a native, per-platform
  dependency breaks `clone + npm install + npm run dev`. Kept as an **opt-in** backend instead.
- **Engine in the local Node server behind an `Engine` interface (chosen).** Unifies with the
  server-side "compute where the data is" model, keeps the backend swappable (WASM now, native later)
  without touching feature logic, and imposes no install friction by default.

## Consequences

- Adds a Stockfish WASM artifact (~7 MB) to the **server** deps and a `worker_thread` engine host.
  ADR-0001's browser-specific reasoning (no cross-origin headers → single-threaded lite) no longer
  binds; depth/throughput can grow via the multi-threaded WASM build or the native opt-in.
- Analysis is a **manual, separate, incremental pass** (not grafted onto the network-bound Import):
  the player **selects Games to analyze**; a per-Game **`analyzed` flag** (twin of
  `move_habits_computed`, ADR-0005) skips already-analyzed Games so `Evaluation`s are computed once
  and **retained, never recomputed** (Import glossary term). Search runs at a **fixed depth (16)** for
  reproducibility across runs.
- `Inaccuracy`/`Mistake`/`Blunder` use **Lichess's winning-chances method** (10/20/30% drop — see
  CONTEXT.md). Lichess's exact centipawn→win% regression is proprietary; we adopt the **method and
  thresholds** with the standard public winning-chances sigmoid — faithful in method, not
  bit-identical. (Threshold/severity specifics may get their own ADR when the Danger-position grill
  closes.)
- The engine backend can change (WASM ↔ native) with no change to analysis, Mistake or
  Danger-position code, since all of it depends only on the `Engine` interface.
