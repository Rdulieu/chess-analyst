# 05 — The Analysis pass belongs to a Profile

Status: `done` — merged into `integration/US-11-profiles` (build + tests + FP 5/5 green, 2026-08-18)

> **Implemented on the business-story integration branch `integration/US-11-profiles`.** Branch
> from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a green
> local check (build + tests + green FP, no blocking finding); `integration -> develop` stays human.

> **Sequencing: unblocked.** US-13 landed in `develop` (PR #44/#49, 2026-08-17) and this branch is
> rebased on it. The stylesheet, the page skeleton and the token audit are now constraints on this
> slice, not a reason to wait — see the acceptance criteria.

## Parent

`.scratch/profiles/PRD.md` — business story **US-11** (`BACKLOG.md`).

## What to build

An `Analysis pass` runs over **one Profile's** Games (`CONTEXT.md`). Engine time is the most
expensive thing this app spends, so a pass must go exactly where it was pointed: triggering an
analysis while one Profile is current never touches another's Games, and the pass is recorded
against that Profile (`analysis_passes.profile_id`, added in slice 02).

The Profile's own page reports **its** analysis state — how many of its Games are analyzed, and the
state of its pass. Everything ADR-0011 established stays: no progress column, progress derived by
counting the pass's `evaluations` rows; the three outcomes (completed / interrupted / failed);
incremental, so an already-analyzed Game is skipped and its Evaluations are never recomputed.

Note what is **not** here: Evaluations are **not** shared across Profiles. A Game imported under two
Profiles is analyzed twice. That is the duplication ADR-0014 accepts and tracks, with the FEN-keyed
cache named as the escape hatch — out of scope for this story.

## Acceptance criteria

- [x] Triggering an `Analysis pass` covers only the current Profile's Games.
- [x] A pass is recorded against the Profile it ran for.
- [x] The Profile's page shows its analyzed-Games count and its pass state.
- [x] A pass run for one Profile leaves another Profile's analyzed count at whatever it was.
- [x] The pass stays incremental: an already-analyzed Game of that Profile is skipped and its
      Evaluations are not recomputed.
- [x] The three outcomes (completed / interrupted / failed) and the derived progress behave as
      before (ADR-0011).
- [x] The analyze API takes the Profile explicitly; a request naming no Profile, or an unknown one,
      is refused.
- [x] HTTP-seam tests cover the scoping of a pass and the untouched state of the other Profile.

### Feature Path (FP)

1. Two Profiles both hold imported Games; neither has been analyzed.
2. With the first Profile current, I run an analysis over a small set of its Games → it completes,
   and its page reports the Games as analyzed.
3. The second Profile's page still reports zero analyzed.
4. I re-run the pass on the first Profile → the already-analyzed Games are skipped.
5. The danger positions shown while the first Profile is current are built from its analyses alone.

Verify: UI first. Pick the shortest Games available so the pass stays cheap — the point is the
scoping, not the depth of the analysis.

## Blocked by

- `.scratch/profiles/issues/04-every-view-speaks-of-the-current-profile.md` — the current-Profile
  plumbing and the scoped `/danger` this slice's last step reads.

## Feature Path run (2026-08-18) — 5/5 green

Driven UI-first against the running app (server :3101 over a **throwaway** database — never the
user's, ADR-0015 — client :5373), with the **real** chess.com API and the **real** WASM Stockfish.
Two real Profiles: `DudulSmash` (93 Games) and `ToreBjastad` (137 Games), neither analyzed at the
start. Shortest Games picked first, as the FP asks: the shortest is a 3-half-move abandoned daily
game — 4 Positions, 1.3 s.

1. ✅ Two Profiles hold imported Games; both read `0 analysées`.
2. ✅ With DudulSmash current, a pass over its shortest Game completed (`4 positions évaluées ✓`),
   and its page read `93 parties importées · 1 analysée` with the summary beside it. A second pass
   over its ten shortest Games ran with a live readout (`345/383 positions évaluées` caught
   mid-flight) and finished at `Dernière analyse : 10 parties, 383 positions évaluées ✓`.
3. ✅ ToreBjastad's page still read `137 parties importées · 0 analysées` — and carried **no**
   summary at all: DudulSmash's does not leak onto it.
4. ✅ Re-running the pass on DudulSmash's analyzed Game answered `Rien à analyser : la sélection est
   déjà analysée.` — no new `analysis_passes` row, not one Evaluation recomputed.
5. ✅ `/danger` under DudulSmash: 13 entries over its 11 analyzed Games. Analyzing a Game for
   ToreBjastad left every one of those figures identical (11 analyzed, 13 entries, reached
   9/5/3/3/2), and ToreBjastad's own `/danger` showed its own analyzed-but-empty state.

**The decisive probe — the shared match.** `DudulSmash` and `ToreBjastad` played each other; the
match is two rows (`#32` under DudulSmash, `#131` under ToreBjastad, ADR-0014). Analyzing it under
ToreBjastad produced 49 Evaluations on `#131` and left `#32` at `analyzed = 0` with **zero**
Evaluations. The duplication ADR-0014 accepts, observed rather than assumed; the partition holds
where the engine time is actually spent.

Refusals checked live, and checked to be *real*: no `profileId` → 400 with the French message,
unknown → 404, and a `gameId` belonging to the other Profile → 400 `Ces parties n'appartiennent pas
au profil analysé : 32` **with nothing written** (`#32` still `analyzed = 0`, 0 Evaluations). No
console error or warning across the whole run.

## Findings

- **[non-blocking] The Profile page's no-scroll headroom is spent.** Slice 03 measured the page in
  its fullest state at **668 px** with **74 px** of headroom at 1536×742, and asked this slice to
  re-measure. Measured: the pass block (the summary line + its `Fermer` button) costs **85 px**, and
  the page in its fullest state — identity, counters, pass summary, import form *and* a three-month
  import summary — now ends at **745 px**. The 74 px are gone and the fullest state overflows the
  reference height by a few pixels. Non-blocking: it needs both summaries on screen at once, and the
  pass summary is dismissible. How to buy the height back is a layout decision, left to whoever owns
  the page rather than taken here.
- **[non-blocking] Light theme not verified for the new readout.** The app themes by
  `prefers-color-scheme` alone (no `data-theme` toggle — US-13's documented choice), and the driving
  browser sits in dark mode, so only dark was measured: `#a2a9b0` on `#16181a`, the same secondary-
  text pair slice 04 recorded. The new block introduces no colour of its own — it is the existing
  `AnalysisPassStatus`, already audited on two other screens — so the risk is small, but it was not
  observed in light.
- **[non-blocking, inherited] `getSettings`/`saveSettings` are still consumed by nothing** on the
  client (raised by slice 03, untouched here).
