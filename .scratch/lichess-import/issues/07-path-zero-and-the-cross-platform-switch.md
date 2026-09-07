# 07 — Path 0 and the cross-platform switch (HITL)

Status: `done` — **HITL**: touches the real Lichess API and changes the HP suite, both of
which need the requester's arbitration.

> **Implemented on the business-story integration branch `integration/US-12-lichess-import`.**
> Branch from it, PR back into it — **not** `develop`. This slice does **not** auto-merge: it is the
> one that reports the HP suite for the `integration -> develop` PR, which stays a human decision.

## Parent

`.scratch/lichess-import/PRD.md` — business story **US-12** (`BACKLOG.md`).

## What to build

The agentic apex for this story, against the **real** Lichess API rather than a fixture.

- **Path 0 gains a Lichess reference profile.** Path 0 is already the prerequisite outside the
  three-HP cap: it creates the reference profiles, imports against the real API and leaves the
  snapshots the three journeys restore. This is therefore the one place where the new capability
  meets the live Platform, and the three HPs inherit it for free.
- **Reference account: `Metalyst`** — 403 games, 20 populated months across a 71-month span (2017-10
  to 2023-08), including 38 `classical` and 64 `correspondence`. Both new translations are exercised
  for real, and the empty months exercise the distinction the per-month lines exist for: a gap in the
  history versus a gap in the fetching.
- **No fourth HP.** The journey has not changed — import, then find your weak openings — only the
  site behind it. Instead **HP-01 gains one step**: switch from a chess.com Profile to the Lichess
  Profile, and check that the banner names the site and that every figure changes with it. That step
  tests something nothing tested before, since both reference profiles were chess.com until now.
- **The whole HP suite is re-run** and its result pasted into the `integration -> develop` PR, with
  the included issues listed.

**Known coverage limit, to state rather than gloss:** `Metalyst` has **no ultraBullet game and no
aborted game**, so those two rules stay fixture-only and never meet the real API. If that is not
acceptable, it needs a second reference account — a decision for the requester, not for the agent.

## Acceptance criteria

- [ ] Path 0 creates the Lichess reference Profile and imports a known range against the **real**
      Lichess API, leaving a restorable snapshot
- [ ] The imported figures are recorded as expected values the HPs can assert against
- [ ] Path 0 documents the IPv4 pin as a prerequisite, so a future failure is not misread as a rate
      limit
- [ ] HP-01 gains the cross-platform switch step, and the HP suite still numbers **three**
- [ ] The full HP suite is re-run and green, and its result is pasted into the
      `integration -> develop` PR alongside the list of included issues
- [ ] The `ultraBullet` and aborted-game coverage gap is stated explicitly in the PR, not left
      implicit
- [ ] Build and the full test suite green

### Feature Path (FP)

The HP suite itself, including the new step:

1. Run path 0 → the chess.com and Lichess reference Profiles both exist, each with its imported
   range, and the Lichess one shows `classical` and `correspondence` games
2. Run HP-01, HP-02, HP-03 → all three green
3. Within HP-01, switch from a chess.com Profile to the Lichess Profile → the banner names
   lichess.org and **every** figure on screen changes with it

Verify: UI first, against the real running app.

## Run log — 2026-08-21/22, partial

**Done and committed on the integration branch:**

- Path 0 gains `Metalyst` (lichess.org) as a third reference `Profile`, imported over its **full
  71-month span**, with the *Why a third Profile* rationale, the IPv4-pin precondition, and the
  journey grown from 7 to 10 steps.
- HP-01 gains **step 10b**, the cross-platform switch. The suite still numbers **three** HPs.
- HP-02, HP-03, `theme-pass.md` and the inventory `README.md` aligned on the three-Profile standing
  state and the second `Platform` label now rendered on screens 7–8.
- `.agentic/` ignored; build green; **659 tests** (223 server + 436 client).

**path 0: ✅ green**, reported in full and verified independently against both snapshots.

| Figure | Value |
| --- | --- |
| Games fetched over the span | 403 |
| Games imported | 351 |
| of which `classical` | 38 |
| of which `correspondence` | 37 |

Both snapshots read back correct: three Profiles (one `lichess`), `DudulSmash` at 0 then 82
(72 blitz / 10 bullet), `Nonomoho` at 0 throughout, no category outside the five.

**The three HPs are green.** All four scenarios ran to completion; **none of their reports reached
the orchestrator**, and that near-loss is its own finding (below). The reports were recovered intact
from the subagent transcripts under
`~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl`.

| Scenario | Result | Blocking findings |
| --- | --- | --- |
| path 0 | ✅ green, 10/10 steps | none |
| HP-01 | ✅ green, steps 1–11 incl. 7b and **10b** | none |
| HP-02 | ✅ green, unabridged | none |
| HP-03 | ✅ green, 7/7 steps | none |

**Step 10b passed.** Selecting `Metalyst`: banner `Profil courant : Metalyst (lichess.org)`; the
list went 82 → **351** rows; cadences went `blitz 72 / bullet 10` → `rapid 188, blitz 82,
classical 38, correspondence 37, bullet 6`, so **`classical` and `correspondence` appear**; the
analysed counter went `2 sur 82` → `0 sur 351`; `/profiles/3` read `351 parties importées` with its
form header `Import depuis lichess.org — compte Metalyst`; and `/danger` fell back to its empty
state, so step 10's `Danger position` did **not** leak across Platforms. Switching back restored
every figure, the two `✓ analysée` badges included. **No hard-coded `chess.com` surfaced anywhere.**

The theme pass ran in all three scenarios: **48 audits** (8 screens × 2 themes × 3), `problems: 0`
throughout, the five board constants byte-identical between themes, and **0 overflowing boxes** on
the now three-row `/profiles` — the stricter version of the overflow that shipped green until
2026-08-21.

> **The reports were nearly lost, and the reason matters.** Each scenario was dispatched as a
> *named background* subagent. Such an agent's final assistant text is **not** returned to the
> parent; only an explicit `SendMessage` reaches it. All four wrote their reports as ordinary final
> text, and only path 0 — which happened to answer a follow-up via `SendMessage` — was heard. Worse,
> the dispatch prompt told each agent *"your final message is the ONLY thing I see"*, which is true
> of a synchronous subagent and false of these, so the instruction actively steered them away from
> the one channel that worked. Absent listeners were then misread as dead agents; they were agents
> that had finished and cleaned up by pid exactly as instructed.
>
> **For a future run:** require the report via `SendMessage`, and treat the transcripts under
> `subagents/agent-*.jsonl` as the recovery path. Do not infer a scenario's outcome from database
> row counts.

### Findings — all non-blocking, none against US-12

- **Stale Check in HP-02** (`HP-02-explore-move-habits.md`): its step-1 Check still said "`/profiles`
  lists **two** Profiles" while its own Preconditions said three. Doc drift introduced by this
  slice; **fixed**.
- **The `/openings` table is un-paginated** — 46 rows for `DudulSmash`, **199** for `Metalyst`.
  Nothing failed, but the page grows linearly with history, and the Lichess Profile is what made
  that visible.
- **The Game list's state column is right-aligned, not a fixed track.** The scan holds only because
  the two badges carry identical text; a wider badge would break the alignment while the check
  still passed.
- **`/danger`'s ⚠ cue had no subject** in HP-01's state, so it went *unexercised* rather than green.
- **The move-habit depth cap (40 Moves) has no subject** on real data — the deepest line is 21
  half-moves. It is assertable only in a fixture-based FP.
- **Side-to-move readout at a mated Position** still reads "Trait aux Noirs" with zero candidates.
- **Side radios serialise as `value="on"`** — harmless (the app reads `checked`), but meaningless
  outside React state.
- **Known-open, unchanged**: the disabled control's label at 2.63:1 light / 3.51:1 dark.
- **Driver, not the app**: `emulate` with a `viewport` argument reloads the document and discards
  the injected audit — `theme-pass.md`'s "switch by emulation, never by reloading" holds for
  `colorScheme` alone. A shared browser stole the selected page ~20 times across the parallel runs;
  the `location.port` guard caught every one, which is what kept actions off siblings' apps.
- **`npm run dev -w server` orphans its listener** — the wrapper's pid is not the listener's. Two
  agents believed they had stopped their app while it was still serving.

### Still owed by this slice

- [ ] HP-01, HP-02, HP-03 run and **reported**, step 10b included
- [ ] The suite result pasted into the `integration -> develop` PR with the issues listed
- [ ] The `ultraBullet` / aborted-game coverage gap stated explicitly in that PR

## Blocked by

- `.scratch/lichess-import/issues/02-five-time-control-categories.md`
- `.scratch/lichess-import/issues/05-what-we-do-not-keep.md`
- `.scratch/lichess-import/issues/06-month-boundary-and-rate-limit.md`
