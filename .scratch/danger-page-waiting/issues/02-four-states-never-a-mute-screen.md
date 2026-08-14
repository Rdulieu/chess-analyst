Status: done

## Parent

`.scratch/danger-page-waiting/PRD.md` (US-10b — `BACKLOG.md`).

Implemented on the business-story integration branch
`integration/US-10b-danger-page-waiting` — branch sub-work from it and merge back into it via
PR, **not** `develop`. Auto-merges once the local check (build + tests + this issue's Feature
Path) is green.

## What to build

This is the slice the US is named after: **ne pas attendre dans le vide**.

`DangerPage` currently has two branches where there are four outcomes. It renders nothing at all
while the response is in flight (the blank screen), and its failure handler falls back onto the
same branch as "nothing analyzed" — so a server error tells the Player to *analyse their games*,
which is exactly what they just did.

Four distinct states, none of which redirects to another:

| state | what it shows |
|---|---|
| computing | a plain text readout in a live region — the computation is announced, not merely drawn |
| server error | names the failure and offers to retry; **never** the invitation |
| no analyzed Game | today's invitation, unchanged |
| analyzed, nothing recurring | explains that the analyzed Games do not yet pass through the same Positions again |

**Text, not a spinner, and no minimum display time.** Once slice 03 lands the wait is ~0.1 s, where
a spinner flashes and reads as a rendering glitch. The live region also gives the agentic tier
something to observe rather than a pixel to guess at.

The fourth state is new — it only became reachable once slice 01 introduced the recurrence floor,
and it is now the normal outcome for a Player with one or two analyzed Games. Its wording must
point at the action that helps (analyse more Games), not repeat the invitation, which would read as
"you have done nothing" to someone who has just waited through an analysis pass.

## Acceptance criteria

- [ ] While the response is in flight the page shows a text readout; it is never blank and silent.
- [ ] That readout is in a live region, so it is announced rather than only displayed.
- [ ] No spinner, and no artificial minimum display duration.
- [ ] A failed request renders an error message naming the failure, with a way to retry from the
      page — without a full reload.
- [ ] The error state never renders the "analysez vos parties" invitation.
- [ ] Retrying after the failure clears the error and renders the Positions.
- [ ] With no analyzed Game, the existing invitation is unchanged.
- [ ] With analyzed Games but no recurring Position, a distinct message explains that Games do not
      yet revisit the same Positions, and points at analysing more — not at analysing at all.
- [ ] The four states are mutually exclusive; none is reachable as a fallback for another.
- [ ] No new live region is added beyond this one (US-8 left the page with a single one of ours;
      `react-chessboard`'s is third-party and out of scope).

### Feature Path (FP)

1. Open "Positions dangereuses" on an analyzed history → a text readout announces the computation
   before the results appear; at no point is the page blank and silent.
2. The computation completes → the readout disappears and the Positions are shown.
3. Make the server unavailable and reopen the page → it announces a failure and offers to retry; it
   does **not** offer to analyse Games.
4. Retry once the server is back → the Positions appear.
5. On a database with no analyzed Game → the invitation to analyse.
6. On a database with a single analyzed Game → the page explains that no Position recurs yet, and
   does not tell the Player to analyse their Games.

Verify: UI first. Step 6 depends on slice 01's recurrence floor being in place.

## Blocked by

- `.scratch/danger-page-waiting/issues/01-recurring-positions-most-dangerous-first.md` — the fourth
  state does not exist without the recurrence floor, so FP step 6 is unreachable before it.
