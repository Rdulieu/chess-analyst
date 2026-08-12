Status: done — auto-merged into `integration/US-8-analysis-pass-completion` (PR #18).
Green local check: build + lint + 213 tests (110 server, 103 client). Feature Path 3/3 green,
no console error. Step 2 ("apparent at a glance") was judged on a **screenshot of the running
app**, not on an assertion: the pills stand out from each row's label in a way the previous bold
text did not. The visual reinforcement therefore ships with **no unit test of its own** — no
automated assertion honestly says "this is noticeable"; a test does lock the two project
constraints (inline style, never a CSS class; textual cue kept).
Non-blocking finding raised: the global count and the pass summary use the same visual pattern
and sit adjacent ("6 parties · 3 analysées" vs "1 partie · 3 positions évaluées ✓"), which reads
as one correcting the other. It emerges from their juxtaposition — neither slice 02 nor 04 could
see it alone.

## Parent

`.scratch/analysis-pass-completion/PRD.md` (US-8 — BACKLOG.md).

Implemented on the business-story integration branch
`integration/US-8-analysis-pass-completion` — branch sub-work from it and merge back into it via
PR, **not** `develop`. Auto-merges once the local check (build + tests + this issue's Feature
Path) is green.

**Independent of issues 01–03** — it touches only the Game list, so it can run in parallel with
the tracer bullet.

## What to build

Answer "where do I stand overall?" without making the Player scan 54 rows. Today the only signal
is a bold `✓ analysée` per row, and nothing at all above the list.

- **Reinforced badge**: the per-Game "analysée" mark becomes obvious at a glance in a long list.
  The app ships **no stylesheet**, so it must use an inline style, and it must never rely on
  colour alone — keep a textual/checkmark cue as the accessible carrier (same rule the `/danger`
  and `/openings` highlights follow).
- **Global count** above the list: how many Games are analyzed out of the total (e.g. "54 parties ·
  32 analysées"). Computed from the Games already loaded by the page — **no extra server call**,
  no new endpoint.
- The count is correct **whenever the page is opened**, not only just after a pass, and follows
  along when more Games get analyzed.

## Acceptance criteria

- [ ] The badge is rendered with an inline style (no CSS class — the app has no stylesheet).
- [ ] The badge remains legible without colour perception (text/checkmark cue retained).
- [ ] The global count shows analyzed Games out of the total.
- [ ] The count is derived from the loaded Games, with no additional request.
- [ ] The count is correct on a fresh page load with a partially analyzed history.
- [ ] The count and the badges update after a pass without a manual reload.
- [ ] The empty-history state shows no misleading count.

### Feature Path (FP)

1. Open "Mes parties" with a partly analyzed history → a global count states how many Games are
   analyzed out of the total.
2. Scan the list → which Games are analyzed is immediately apparent.
3. Analyze one more Game → both the count and the list marking follow.

Verify: UI first.

## Blocked by

None - can start immediately (parallel with issue 01).
