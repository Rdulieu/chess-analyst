# 01 — "Mes parties" tells the Player their history is empty when the load fails

Status: needs-triage

Reported from the US-13 Happy Path replay (2026-08-17). It is **not US-13's to fix** — no stylesheet
change causes it and none would fix it — and it is filed here rather than left inside
`.scratch/stylesheet/issues/06-revise-the-hp-suite.md` so it does not die with that story.

## What happens

`GET /api/games` failed (a 502 from the relay, while a server was restarting). The screen rendered
its **empty-history invitation** — "No games yet — import your chess.com history to get started." —
while the local database held **82 Games**.

The fetch's rejection is swallowed and the empty state is shown for it: a failure to *load* is
presented as a fact about the Player's *history*. So the app states something false about the
Player's own data, and it points them at the one action that cannot help — importing Games they
already have. On a real import over a flaky connection, the Player's likeliest reading is that the
import lost everything.

Seen incidentally rather than by a scenario step, which is worth noting: no HP asserts anything about
this screen when the API is down, because no scenario takes the API down.

## Why it is worth more than a wording fix

Three states are collapsed into one screen: *loading*, *loaded and genuinely empty*, and *the load
failed*. The first two are distinguishable today only by timing; the third is indistinguishable from
the second, which is the actual defect. The invitation is the correct thing to show for exactly one
of the three.

The same shape very likely exists on the other screens that fetch on mount (`/stats`, `/openings`,
`/danger`, `/explorer`): each has an empty-state invitation and a `.catch` that leads to it. Worth
checking as one job rather than patching the Game list alone — that is the argument for a small
story rather than a one-line fix.

## What "fixed" would look like, roughly

- A failed load says so, and offers to retry; it does not speak about the Player's history.
- The empty-history invitation appears only when the server actually answered "no Games".
- Whatever is decided, the distinction is observable in the UI, so an agentic test can assert it by
  making the API fail.

Deliberately no implementation prescribed — the shape of the error state, and whether it is one
shared component or per screen, is the triage decision.

## Not in scope for whoever picks this up

Retry policy, offline support, and the relay's own error handling. The finding is only that a failed
load is currently indistinguishable from an empty history.
