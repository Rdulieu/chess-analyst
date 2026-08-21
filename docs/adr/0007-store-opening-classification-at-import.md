# Store chess.com's opening classification on Games at import; aggregate weak-opening stats on the fly

`Weak opening` (US-3) needs each Game's `Opening` (see CONTEXT.md), but nothing in our data
carries it: `games` stores only the raw `pgn`. chess.com stamps every classified game's PGN with
`[ECO "B22"]` (the code — the `Opening`'s identity) and `[ECOUrl ".../Sicilian-Defense-Alapin-Variation"]`
(a human-readable named line). We **resolve the opening once, at import**, from those headers and
**store it explicitly** on the Game (a new `eco` column plus an `openingName` column derived from
the ECOUrl slug), rather than parsing the PGN header on every read or recomputing the ECO
ourselves. This mirrors how we already trust chess.com's own `time_class` for the time control
category (see `Game`): we treat chess.com as the authority on classification and record its verdict.

The `Weak opening` breakdown is then a plain on-the-fly `GROUP BY eco, player_color, time_control_category`
over `games` — reusing US-6's `Win rate` primitive (see below). So there are **two different
treatments on purpose**: the *classification* is precomputed (resolved once at import, from an
external source we must not re-derive), while the *aggregation* is computed on demand (a cheap
group-by, no scan). This is deliberately unlike `Move habit` (ADR-0005), which precomputes a
**counter table** — that was only justified by the cost of rescanning PGNs for transpositions on
every read, a cost that does not exist here.

## Considered options

- **(A) Parse the `[ECO]`/`[ECOUrl]` header on every read** — no schema change, but re-parses
  every PGN on each view and leaves the opening implicit in a text blob. Rejected: the classification
  is a stable per-Game fact; deriving it repeatedly is wasteful and keeps it non-queryable.
- **(B) Compute the ECO ourselves from the moves** (bundle an ECO position database) — works on any
  PGN, headers or not, but pulls in a dataset, is heavier, and can disagree with chess.com's own
  classification, which is the classification the Player sees on chess.com. Rejected as
  over-engineering for a local single-user tool (ADR-0002).
- **(C) Resolve at import, store `eco` + `openingName` on `games` (chosen)** — one schema change,
  classification queryable and resolved exactly once, aggregation becomes a trivial group-by.
  The cost that would normally count against a schema change (migration, backfill of existing rows)
  does not apply in the current dev phase: re-importing is cheap and the local data is throwaway
  (see `CLAUDE.md` "Dev phase" rules, `[[dev-phase-schema-and-reimport]]`).

## Consequences

- **Schema + import change.** `games` gains `eco` and `openingName`, populated in the pure import
  mapping (`toGame`) from the PGN headers. Pre-existing local rows carry no opening until
  re-imported — acceptable under the dev-phase rules (no backfill machinery owed).
- **ECO-code identity, with an `Other` catch-all.** A `Weak opening` entry is keyed by
  (`eco`, side, cadence) per the glossary. Games chess.com did not classify (aborted / too short —
  no `[ECO]` header) are stored under the sentinel `eco = "other"` and surface as a single **Other**
  opening, rather than being dropped or left `null` (keeps the `GROUP BY` total honest and visible).
- **The `Win rate` primitive is extracted to a shared kernel.** `Win rate` is the canonical metric
  reused across `Weak opening`, `Move habit` and the global stats view (CONTEXT.md). Its
  implementation (`Bucket` + the `(win + 0.5·draw)/games`, null-on-empty calc) is lifted out of
  US-6's `server/src/stats/repository.ts` into a neutral module both features depend on, so the
  dependency graph points at a shared domain kernel rather than creating a false US-3 → US-6 edge.
  Each feature composes its own row shape around the primitive (e.g. `{ eco, name, side, cadence, ...Bucket }`)
  rather than widening a shared type — reuse of one domain concept, not coupling of two features.
- **Aggregation stays on the fly** (like US-6, unlike ADR-0005): no weak-opening counter table, no
  precompute flag, nothing to keep in sync.

## Amendment (US-12, 2026-08-21): the Platform is the authority, not chess.com

With Lichess as a second `Platform`, "chess.com's classification" becomes "**the classification of
the `Platform` the Game was played on**, never recomputed". Lichess answers its own `{ eco, name }`
(when the export is asked for `opening=true`), and the two Platforms do **not** agree: they detect
at different plies and name lines differently, so the same moves can carry a different ECO on each
side.

We accept that, and the reason is that **the two classifications can never meet in one figure**.
ADR-0014 makes the `Profile` partition every aggregate, and a Profile is *one account on one
Platform* — so `/openings`' `GROUP BY (eco, player_color, time_control_category)` always runs over a
single Platform's Games. There is nothing to reconcile because there is nothing to mix.

- **Consequence to state plainly:** comparing a chess.com Profile's openings with a Lichess
  Profile's is meaningless in this tool. That is not a new limitation, it is ADR-0014's partition
  applied to one more field.
- **Option (B) is rejected again, and harder.** Computing the ECO ourselves would be the only way
  to make the two Platforms agree — the very reason to reject it stands: the classification a Player
  should see is the one their own Platform shows them, and two Platforms showing two answers is a
  fact about the Platforms, not a defect to paper over.
- **Reading it is per-Platform.** `parseOpening` stays the **chess.com** adapter's PGN-header
  parser; the Lichess adapter reads the structured `opening` field of the JSON instead of
  re-parsing a PGN. Neither becomes a shared utility — the shared thing is the `Opening` concept
  and the `other` sentinel, not the extraction.
- **The `other` sentinel is unchanged and still earns its keep**: Lichess likewise omits `opening`
  on games too short to classify.
