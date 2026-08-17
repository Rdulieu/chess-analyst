# 05 — The Analysis pass belongs to a Profile

Status: `ready-for-agent`

> **Implemented on the business-story integration branch `integration/US-11-profiles`.** Branch
> from it, PR back into it — **not** `develop`. Auto-merges into the integration branch on a green
> local check (build + tests + green FP, no blocking finding); `integration -> develop` stays human.

> **Sequencing:** do not start before **US-13 (stylesheet)** has landed and this branch is rebased
> on its outcome. See the PRD's *Further Notes*.

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

- [ ] Triggering an `Analysis pass` covers only the current Profile's Games.
- [ ] A pass is recorded against the Profile it ran for.
- [ ] The Profile's page shows its analyzed-Games count and its pass state.
- [ ] A pass run for one Profile leaves another Profile's analyzed count at whatever it was.
- [ ] The pass stays incremental: an already-analyzed Game of that Profile is skipped and its
      Evaluations are not recomputed.
- [ ] The three outcomes (completed / interrupted / failed) and the derived progress behave as
      before (ADR-0011).
- [ ] The analyze API takes the Profile explicitly; a request naming no Profile, or an unknown one,
      is refused.
- [ ] HTTP-seam tests cover the scoping of a pass and the untouched state of the other Profile.

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
