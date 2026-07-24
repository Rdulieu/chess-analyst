# Stockfish runs client-side as WASM, single-threaded lite build

> **Status:** superseded by [ADR-0008](0008-engine-runs-in-local-node-server.md) — the engine now
> runs in the **local Node server** behind a swappable `Engine` interface (US-4). ADR-0001's
> rejection of a "server" engine assumed a *hosted/remote* backend; that objection does not apply to
> this app's local Node process. The engine-choice reasoning below (WASM vs native, threading) is
> retained as context; only the **location** (browser → local server) is reversed.

We need to evaluate positions with a chess engine. We chose to run **Stockfish compiled to
WebAssembly, entirely in the browser** (no analysis backend), using the **single-threaded
"lite" build** (e.g. `nmrugg/stockfish.js`'s lite-single variant) rather than the multi-threaded
build or a server-hosted engine.

## Considered options

- **Server-hosted Stockfish**: a backend process running native Stockfish, exposed over an API. Rejected — this is a solo tool with no need to share analyses between users; a backend adds hosting, an API, and auth for no real benefit here.
- **Multi-threaded WASM build**: faster search via `SharedArrayBuffer`, but requires the host to send `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers (cross-origin isolation) — a hosting constraint not all static hosts support out of the box. Rejected for the added deployment friction.
- **Single-threaded lite WASM build (chosen)**: no special headers, ~7 MB, simple Web Worker + UCI messaging. Weaker than the multi-threaded build but far stronger than any human, which is all this tool needs.

## Consequences

Analysis depth/speed is capped below what a multi-threaded or server-hosted engine could reach. If that ever becomes a real constraint (e.g. deep batch analysis of the full game history), revisit toward the multi-threaded build first (same client-side model, just needs the right hosting headers) before considering a backend.
