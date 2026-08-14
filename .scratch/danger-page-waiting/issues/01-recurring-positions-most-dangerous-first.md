Status: done

## Parent

`.scratch/danger-page-waiting/PRD.md` (US-10b — `BACKLOG.md`).

Implemented on the business-story integration branch
`integration/US-10b-danger-page-waiting` — branch sub-work from it and merge back into it via
PR, **not** `develop`. Auto-merges once the local check (build + tests + this issue's Feature
Path) is green.

## What to build

`/danger` stops contradicting its own definition. A `Danger position` is a **recurring** Position
(`CONTEXT.md`), and today the aggregate returns every Position ever reached — measured on the real
history: **3736 entries, of which 66 were reached more than once**. The 3670 singletons are 400 KB
of JSON and 3670 `react-chessboard` instances rendered at once, which is a large part of the wait
this US is about, and no amount of server-side work would fix it.

Three changes, end to end from the derivation to the page:

- **Recurrence floor**: only Positions reached at least twice are `Danger position`s. A Position
  seen once is a moment of a single Game and belongs to that Game's review (the Analyse page).
- **The initial Position is excluded** — by its nature (ply 0), not by comparing FENs. It is reached
  in 100% of Games by construction, so it is not something the Player *arrives at*.
- **Ranking by serious-error `proportion`**, reach count breaking ties. Today the sort is by reach
  count, which puts the starting Position permanently first and buries the dangerous ones — the
  inverse of what the page exists for. (Measured: `max reach` equals the Game count at every
  history size, which is the starting Position every time.)

The endpoint keeps returning the **full ranked list** (~850 entries ≈ 90 KB at a year's scale, cheap
enough); the **page renders at most 30** diagrams and states the real total, so the cap stays a
display decision that can be retuned without touching the contract or redefining the term.

`DangerEntry`'s shape is unchanged. The side-to-move readout, the board orientation (US-10a) and the
semantic highlight with its non-colour cue all stay as they are.

## Acceptance criteria

- [ ] No entry with `reached < 2` is returned by the aggregate.
- [ ] The initial Position never appears, whatever the history.
- [ ] Entries are ordered by `proportion` descending, `reached` descending as tie-break.
- [ ] The reach count remains displayed next to the proportion (no minimum sample size beyond the
      floor of two — `CONTEXT.md`).
- [ ] The endpoint returns the complete ranked list, uncapped.
- [ ] The page renders at most 30 diagrams and states the total number of `Danger position`s when it
      exceeds what is shown.
- [ ] Each diagram still states its side to move and is presented from that side (US-10a).
- [ ] Positions at 50%+ serious-error proportion keep their highlight and its non-colour cue.
- [ ] On the real history the payload drops from ~400 KB to ~7 KB (verified by observation, not
      asserted as a fixed number).

### Feature Path (FP)

1. With an analyzed history where some Positions recur and others do not → the page lists only
   those reached at least twice.
2. Read the first entry → it is the one with the highest serious-error proportion, not the most
   frequently reached.
3. Look for the starting Position in the list → it is absent.
4. With more than 30 recurring Positions → at most 30 diagrams are shown, and the page states the
   real total.
5. Each diagram still states its side to move and is presented from that side.

Verify: UI first. The `seed:danger` fixture gives deterministic data for the ordering and the floor.

## Blocked by

None - can start immediately.
