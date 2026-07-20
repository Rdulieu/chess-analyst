# The app runs entirely on the player's own machine, launched on demand — no cloud deployment

Importing games from chess.com needs a server-side relay (the chess.com public API doesn't send
CORS headers, so a browser can't call it directly — any non-browser context can). We decided
**not** to deploy that relay to a cloud platform (serverless or otherwise): the whole app,
frontend and relay together, runs **only on the player's own machine, only while they've
launched it** — no always-on personal server, no public URL, no hosting account.

## Considered options

- **Cloud serverless relay** (Cloudflare Worker / Vercel Edge Function) fronting a client-side app: rejected — introduces a cloud account and a deployed, internet-facing endpoint for a tool meant to run only locally, on demand.
- **Self-hosted always-on server** (home server, NAS): rejected — not what the player wants; this isn't a service to keep running, just a tool to launch when needed.
- **Local-only, launched on demand (chosen)**: the chess.com relay is a small local process, started together with the frontend by a single local command. No deployment, no hosting.

## Consequences

The chosen stack/framework must be able to start both the frontend and the local relay with a
single command — this becomes a constraint on the next technology choice (runtime/framework
selection). There is no environment beyond "the player's machine, right now" to design for: no
multi-user concerns, no auth, no production deployment pipeline.
