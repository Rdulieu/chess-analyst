---
id: HP-02
covers: [Move habit, Opponent reply, Position, Move, Profile, Board orientation, Theme]
---

# HP-02 — Explore my move habits

## Goal
With a `Profile`'s real chess.com history in place, the Player selects that Profile and opens the
Move habit explorer for a side, reads which Moves they've actually played from the starting Position
(with frequency, win rate and per-cadence breakdown), and drills down level by level — via the list
and via the board arrows — with a breadcrumb tracking the path. This is US-5's core value:
surfacing the Player's own habits across their whole imported history.

> Runs on **real chess.com data**, restored from the snapshot [path 0](./path-0-bootstrap.md) built
> against the live API — not a fixture archive, and not a second import. The deterministic
> frequency/rate assertions live in the sub-issues' fixture-based Feature Paths; here, on real data,
> assert **shape and internal consistency**, not fixed numbers.

## Drive-by
- Navigation: reaching the explorer as its own page from the app's navigation.
- `Profile` scoping (US-11): the explorer's habits are **the current Profile's** and the chrome's
  banner names it, so a habit can never be mistaken for another Player's.
- Whole-history aggregation: the explorer reflects all of that Profile's imported Games, with no
  per-run scope selector.
- Depth cap: no further descent is offered past 20 full moves (40 Moves).
- `Board orientation` (US-10a, graft — no dedicated HP; the 3-HP cap is already spent): the board
  is presented from the **side being explored**, the existing side selector being the only control
  that turns it, and it is **held constant down the whole line** — it must not flip when an
  `Opponent reply` has the move. The **side to move** is stated in text at every level.
- The stylesheet and the dark theme (US-13): the final step walks all eight screens in both themes.
  This scenario's state has an imported history but no analysed Game, so it is the pass that sees
  `/danger` in its empty state — deliberately, since the empty state is a rendered screen too.

## Preconditions
- App started locally, on this scenario's own port and its own database file.
- **Clean data state, restored not imported**: [path 0](./path-0-bootstrap.md)'s **imported
  snapshot** copied into this scenario's database file, with the server stopped. It holds the
  `DudulSmash` `Profile` and its whole reference range — **82** Games over 2026-05 → 2026-06 (72
  blitz / 10 bullet, all standard chess), none analysed — **and a second Profile, `Nonomoho`, owning
  nothing**. The copy is a pristine state: this scenario never reads what another left behind.
- **Nothing is selected on arrival.** The current `Profile` is held client-side, not in the
  database (ADR-0014), so restoring the snapshot restores the Games and no selection — step 1
  selects the Profile, which is what this scenario must show anyway.

## Journey
1. Open the app with the restored history and select `DudulSmash` as the current `Profile` on `/profiles` → the Profile is listed with its imported Game count, becomes the current one, and the chrome's banner names it from then on.
2. Navigate to the Move habit explorer page and choose a side (e.g. White) → candidate Moves from the starting Position are shown, the board is presented from that side, and the side to move is stated.
3. Read the candidates → each shows a frequency, a win rate, and a per-time-control-category breakdown; the exact count behind each is visible.
4. Observe the board → the candidate Moves are also drawn as arrows, with visibly varying opacity (frequency) and colour hue (win rate). (react-chessboard v5 supports per-arrow colour only, so frequency is encoded as opacity, not stroke thickness — see ADR-0006 context and `client/src/chess/arrows.ts`.)
5. Descend one level by selecting a candidate **in the list** → the explorer shows the candidates played from the resulting Position, and the breadcrumb reflects the Move taken.
6. Descend a further level **from the board** — click the candidate Move's destination square → the explorer descends exactly as the list would, and the breadcrumb reflects the second Move.
7. Select an earlier entry in the breadcrumb → the explorer returns to that level.
8. Return to `Départ` in the breadcrumb, then switch the side selector to Black — **the side switch does not reset the path**, and the other side's habits down a line reached as White are typically empty, so the assertion below is only meaningful from the starting Position → the candidates from the starting Position update to the Black-side habits, **and the board turns over** to be read from Black.
9. Still exploring as Black, descend a level → the level where the opponent has the move is reached, the side-to-move readout says so, and **the board has not turned back**. Walk back up the breadcrumb → it has still not turned.
10. **Theme pass (US-13)** — walk the navigation across **all eight screens** (Mes parties,
    Explorateur, Ouvertures, Positions dangereuses, Stats, Analyse by opening a Game, Profils, and
    the Profile's own page by opening `DudulSmash` from the list), first in the light theme, then
    again with the system's **dark preference emulated** → every screen is painted in the theme the
    system asks for, and everything the Player must be able to read stays readable in both. **No
    further Import and no further analysis**: the pass reuses the state step 1 restored and selected.

    > The rules asserted here, the eight screens, the audit tooling and the known-open findings are
    > written once in [`theme-pass.md`](./theme-pass.md) — the same step closes HP-01 and HP-03. This
    > scenario is the one that audits the explorer *after* it has been driven, arrows on the board
    > included: an arrow's hue and opacity are computed per data point and belong to no token, so
    > they must be seen to be unchanged at night.

## Checks
### UI
- Step 1: `/profiles` lists **two** Profiles; `DudulSmash` reads **82** Games imported and **0** analyzed, and selecting it marks its row "Profil actuel" in words while the other still offers "Sélectionner" — and nothing on the list overflows its container, and every scoped screen afterwards carries the banner naming `DudulSmash`. No screen is read before a Profile is current.
- Step 2: the explorer is a distinct page reached via navigation; a side selector is present; at least one candidate Move is shown from the starting Position (the account has real games). Since US-13 the board and the candidates sit side by side while there is room for both and **fold into one column** when there is not — in either case nothing is clipped and the page does not scroll sideways.
- Step 3: every candidate shows a frequency, a win rate, and a per-cadence breakdown; the win rate is consistent with standard scoring `(wins + 0.5·draws)/games` and lies within 0–100%; the per-cadence counts sum to the candidate's game count; no candidate is hidden for a small sample.
- Step 4: each listed candidate has a corresponding board arrow; arrow opacity differs between a more- and a less-played candidate, and colour hue differs across the 50% win-rate threshold. On a Black-oriented board the arrows are mirrored with it — they still start and end on the squares the Moves name.
- Step 5: selecting a list candidate replaces the shown candidates with those from the resulting Position; the breadcrumb gains that Move.
- Step 6: descending from the board produces the **same** candidates and breadcrumb as the corresponding list entry would. Note the arrow overlay is `pointer-events: none`, so the arrows are drawn, not clicked: the click lands on the destination **square** underneath. Aim at the square, not at the arrow. On a Black-oriented board the squares keep their names but change place on screen — locate the target **by its square name**, never by where it sat on a White-oriented board.
- Step 7: selecting an earlier breadcrumb entry returns to that level, discarding deeper navigation.
- Step 8: switching side changes the starting-Position candidates to the other color's habits, **and turns the board over** — Black's back rank is now nearest the Player. No control was added to do it: the side selector is still the only one.
- Step 9: the side-to-move readout **alternates** down the line while the orientation **does not move**, on the way down and on the way back up. Exploring as Black, the starting Position reads "Trait aux Blancs" — those candidates are `Opponent reply`s, not the Player's own habits — and the next level reads "Trait aux Noirs". Nothing on this page phrases the side to move as the Player's own.
- Depth: once 40 Moves (20 full moves) deep, no further descent is offered.
- Step 10: on each of the eight screens, in **both** themes — every colour resolves, text contrast
  holds at 4.5:1 (3:1 for large text) against the ground actually painted behind it, nothing scrolls
  sideways, every meaning-bearing tint still carries its non-chromatic cue, and `--white-share`,
  `--black-share` and the board's square tokens are **identical** between the two themes. Full rule
  list, tooling and known-open exceptions: [`theme-pass.md`](./theme-pass.md). The two profiles
  screens are audited here in a state that holds one Profile with a full history and nothing
  analysed — the Profile page's import form and its analysis-pass readout are read in both themes.
  On the explorer specifically, the **arrows keep their hue and opacity between themes** — they encode win rate and
  frequency, not a theme role — and the board's squares and pieces look the same in both. `/danger`
  is expected **empty** here (this scenario analyses nothing) and that empty state is audited like
  any other screen. Nothing is imported and nothing is analysed by this step; a contrast failure
  outside the known-open list is **blocking**.

### Backing store (optional)
- The Move habit aggregate holds one entry per (`Profile`, Position FEN, side, Move) with counters
  whose win/draw/loss parts sum to the entry's total; each imported Game is flagged as computed
  exactly once (no double counting). Every entry carries the `DudulSmash` Profile's id — the
  aggregate is partitioned (ADR-0014), never global.

## Cleanup (best-effort)
- The scenario writes to its own database file, restored from path 0's snapshot. Discard that file;
  the snapshot itself is the run's shared state and is path 0's to manage.
- The current-Profile selection lives in the browser, not the database: clearing the browser state
  (or selecting nothing) is what resets it. A fresh database with a stale selection is precisely the
  state slice 04 handles by dropping the selection.

## Notes
- **No network dependency of its own.** This scenario imports nothing: path 0 paid the real
  chess.com round-trip once for the suite. An unreachable chess.com is a finding **against path 0**,
  not here — but restore the snapshot rather than importing as a workaround, or the scenario stops
  being about habits.
- **Stop the server before restoring.** SQLite keeps serving a replaced inode, so a copy over a
  running server silently leaves the old data in place.
- The reference range is **immutable past months**, so the restored set — and therefore the habits —
  are stable across runs.
- Assert the **shape and internal consistency** of frequencies/rates (counts present, parts sum,
  rate in range, list/arrow parity), never fixed numbers — the real games drive the values.
