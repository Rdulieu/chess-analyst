# 01 — A truncated stream is not a finished one

Status: `done` — mergée dans l'intégration le 2026-08-23 (merge `943de82`).

> **Implemented on the business-story integration branch `integration/US-17-lichess-fetch-window`.**
> Branch from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a
> green local check (build + tests + green FP, no blocking finding); `integration -> develop` stays
> human.

## Parent

`.scratch/lichess-fetch-window/PRD.md` — business story **US-17** (`BACKLOG.md`).

## What to build

Make a **prematurely ended** games stream surface as a failure, never as a clean end.

This hole exists **today**, before any of the rest of US-17: the Lichess export is read as ndjson
line by line, and if the connection drops mid-body the reader simply stops yielding. The month then
imports partially and is reported at **zero** — indistinguishable from a month the Player was
inactive in. That is precisely the "gap in the fetching disguised as a gap in the history" the
per-month lines exist to prevent (`CONTEXT.md`, `Monthly import`).

It is the first slice because everything US-17 builds afterwards — deriving month coverage from the
Games that arrived — **rests on a break being detectable**. Built on an undetected truncation, the
accounting would report success while losing data.

**Establish the behaviour in red first.** Drive the real client against a stand-in that writes half
the ndjson body and then destroys the socket, and find out what actually happens. Lichess serves the
export chunked, so a premature end should be raisable; if the client does not surface it, this slice
adds what does. Do not assume either way — measure, then build.

Nothing else changes: no port change, no request-count change, no schema change.

## Acceptance criteria

- [ ] A games stream that ends before the body is complete raises, rather than yielding what arrived
      and stopping.
- [ ] The affected month is reported **in failure**, carrying a message, not as a month at zero.
- [ ] A month genuinely holding no Games is still reported at zero, unchanged.
- [ ] The two are distinguishable **in words**, not by tint alone.
- [ ] Games that did arrive before the break are **kept** — the failure does not roll them back.
- [ ] A complete stream behaves exactly as before, on both Platforms.
- [ ] Lower tier: the adapter test drives a real HTTP stand-in that truncates mid-body; the
      assertion is on the client's observable behaviour, not on how the end is detected.

### Feature Path (FP)

1. Import a month from a Platform whose stream is cut mid-body → the month is reported **in
   failure**, with a message.
2. Import that same month with the stream intact → it is reported with its real count.
3. The failed month and an empty month are told apart on screen **without relying on colour**.
4. The Games that arrived before the cut are present under the Profile.

Verify: UI first — the summary's per-month lines. Probe the store only to confirm the arrived Games
were kept.

## Blocked by

None - can start immediately.
