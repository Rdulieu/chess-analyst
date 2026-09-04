---
id: HP-02
covers: [Move habit, Opponent reply, Weak opening, Opening, Win rate, Position, Move, Profile, Board orientation, Theme]
---

# HP-02 — Read my aggregates

## Goal
With a `Profile`'s real chess.com history in place, the Player selects that Profile and reads what
the history *says about them*: which Moves they actually play from a given Position (`Move habit`,
US-5) and which `Opening`s they lose with (`Weak opening`, US-3). Both are whole-history aggregates
of the same imported Games, read on their own page, and both are **the current Profile's** —
switching Profile takes them away and brings them back untouched.

> **Merged from the former HP-02 and HP-03 at US-16b**, and the merge cost no assertion: the two
> opened on the same sentence, restored the same snapshot, and both asserted **shape and internal
> consistency rather than fixed numbers**. What was duplicated was the preamble — selecting a
> Profile, and walking the navigation in two themes — not the journeys. The slot that freed up went
> to [HP-03](./HP-03-read-blind-and-confront.md), because a Happy Path carries a core value and
> "confront my reading with the engine's" is one.

> Runs on **real chess.com data**, restored from the snapshot [path 0](./path-0-bootstrap.md) built
> against the live API — not a fixture archive, and not a second import. The deterministic
> frequency/rate/ECO assertions live in the sub-tickets' fixture-based Feature Paths; here, on real
> data, assert **shape and internal consistency**, never fixed numbers.

## Drive-by
- Navigation: reaching the explorer and the `Weak opening` view as their own pages.
- `Profile` scoping (US-11): both aggregates are **the current Profile's** and the chrome's banner
  names it. This scenario is the one that **switches Profile and watches the figures follow**, which
  is the only way the partitioning of ADR-0014 is observed rather than assumed.
- Whole-history aggregation: both views reflect all of that Profile's imported Games, with no
  per-run scope selector.
- Opening classification from chess.com: each entry carries an ECO code and a readable name taken
  from the imported Games (never recomputed locally); Games chess.com did not classify fold into a
  single **Other** entry.
- Depth cap: no further descent is offered past 20 full moves (40 Moves).
- `Board orientation` (US-10a, graft — no dedicated HP; the 3-HP cap is already spent): the board is
  presented from the **side being explored**, the existing side selector being the only control that
  turns it, and it is **held constant down the whole line** — it must not flip when an
  `Opponent reply` has the move. The **side to move** is stated in text at every level.
- The stylesheet and the dark theme (US-13): the final step walks all nine screens in both themes.
  This scenario carries **two** night-time duties the merge must not drop: the explorer's **arrows**,
  whose hue and opacity are computed per data point and belong to no token, and the
  **weak-opening highlight**, the tint US-13's slice 02 measured at 1.02:1 before it gained its own
  ink token. Its state has an imported history and **no analysed Game**, so it is also the pass that
  sees `/danger` in its empty state — deliberately, an empty state being a rendered screen too.

## Preconditions
- App started locally, on this scenario's own port and its own database file.
- **Clean data state, restored not imported**: [path 0](./path-0-bootstrap.md)'s **imported
  snapshot** copied into this scenario's database file, with the server stopped. It holds the
  `DudulSmash` `Profile` and its whole reference range — **82** Games over 2026-05 → 2026-06 (72
  blitz / 10 bullet, all standard chess), none analysed — **a second Profile, `Nonomoho`, owning
  nothing**, and a **third on lichess.org, `Metalyst`, carrying its own imported history** (US-12).
  This scenario is about `DudulSmash`, and every figure it asserts is `DudulSmash`'s: `Metalyst` is
  present so that a figure which silently aggregated across Profiles — or across Platforms — would
  be wrong here rather than plausible. The copy is a pristine state: this scenario never reads what
  another left behind.
- **Nothing is selected on arrival.** The current `Profile` is held client-side, not in the database
  (ADR-0014), so restoring the snapshot restores the Games and no selection — step 1 selects the
  Profile, which is what this scenario must show anyway.

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
10. Navigate to the `Weak opening` view (`/openings`) → a table of openings is shown.
11. Read the table → each row is one (Opening, side, cadence) entry showing the opening name and its ECO code, the side (Blancs/Noirs), the cadence, the game count, the win/draw/loss tally and the `Win rate`; the rows are ordered by game count descending.
12. Spot the weak openings → rows with a `Win rate` under 50% are visibly highlighted for review; rows at or above 50% are not.
13. Confirm the breakdown covers the Profile's whole history → the game counts across all entries sum to the **82** Games the Profile holds (each Game contributes to exactly one entry), and any Game chess.com did not classify appears under a single **Other** entry rather than being dropped.
14. Switch the current `Profile` to `Nonomoho` on `/profiles`, then visit **both** aggregates → the
    banner names `Nonomoho`, and **both are gone**: `/openings` shows its empty invitation and the
    explorer offers no candidate, because that Profile owns no Game. Not one of `DudulSmash`'s rows
    survives the switch. Then select `DudulSmash` again → both aggregates are back, unchanged.
15. **Theme pass (US-13)** — walk the navigation across **all nine screens** (Mes parties,
    Explorateur, Ouvertures, Positions dangereuses, Stats, **Mes lectures**, Analyse by opening a
    Game, Profils, and the Profile's own page by opening `DudulSmash` from the list), first in the light theme, then
    again with the system's **dark preference emulated** → every screen is painted in the theme the
    system asks for, and everything the Player must be able to read stays readable in both. **No
    further Import and no analysis**: the pass reuses the state step 1 restored and selected.

    > The rules asserted here, the nine screens, the audit tooling and the known-open findings are
    > written once in [`theme-pass.md`](./theme-pass.md) — the same step closes HP-01 and HP-03.
    > This scenario carries **both** night-time duties of the two it replaces: the explorer's arrows
    > and the weak-opening highlight. Neither is a token, and both were found broken at night once.

## Checks
### UI
- Step 1: `/profiles` lists **three** Profiles — two on chess.com and `Metalyst` on lichess.org, each row naming its own site; `DudulSmash` reads **82** Games imported and **0** analyzed, and selecting it marks its row "Profil actuel" in words while the other two still offer "Sélectionner" — and nothing on the list overflows its container, and every scoped screen afterwards carries the banner naming `DudulSmash`. No screen is read before a Profile is current.
- Step 2: the explorer is a distinct page reached via navigation; a side selector is present; at least one candidate Move is shown from the starting Position (the account has real games). Since US-13 the board and the candidates sit side by side while there is room for both and **fold into one column** when there is not — in either case nothing is clipped and the page does not scroll sideways.
- Step 3: every candidate shows a frequency, a win rate, and a per-cadence breakdown; the win rate is consistent with standard scoring `(wins + 0.5·draws)/games` and lies within 0–100%; the per-cadence counts sum to the candidate's game count; no candidate is hidden for a small sample.
- Step 4: each listed candidate has a corresponding board arrow; arrow opacity differs between a more- and a less-played candidate, and colour hue differs across the 50% win-rate threshold. On a Black-oriented board the arrows are mirrored with it — they still start and end on the squares the Moves name.
- Step 5: selecting a list candidate replaces the shown candidates with those from the resulting Position; the breadcrumb gains that Move.
- Step 6: descending from the board produces the **same** candidates and breadcrumb as the corresponding list entry would. Note the arrow overlay is `pointer-events: none`, so the arrows are drawn, not clicked: the click lands on the destination **square** underneath. Aim at the square, not at the arrow. On a Black-oriented board the squares keep their names but change place on screen — locate the target **by its square name**, never by where it sat on a White-oriented board.
- Step 7: selecting an earlier breadcrumb entry returns to that level, discarding deeper navigation.
- Step 8: switching side changes the starting-Position candidates to the other color's habits, **and turns the board over** — Black's back rank is now nearest the Player. No control was added to do it: the side selector is still the only one.
- Step 9: the side-to-move readout **alternates** down the line while the orientation **does not move**, on the way down and on the way back up. Exploring as Black, the starting Position reads "Trait aux Blancs" — those candidates are `Opponent reply`s, not the Player's own habits — and the next level reads "Trait aux Noirs". Nothing on this page phrases the side to move as the Player's own.
- Depth: once 40 Moves (20 full moves) deep, no further descent is offered.
- Step 10: the view is a distinct page reached via navigation; with a non-empty history a table of openings is shown (not the empty-history invitation).
- Step 11: every row shows a readable opening name **and** an ECO code, a side, a cadence, a game count, a spelled-out win/draw/loss tally, and a `Win rate`; the `Win rate` equals standard scoring `(wins + 0.5·draws)/games` and lies within 0–100%; each row's win/draw/loss parts sum to its game count; rows are in non-increasing game-count order.
- Step 12: at least the highlight rule holds — every row under 50% is highlighted and no row at/above 50% is (a 50% row, if present, is **not** highlighted; the threshold is strict). The highlight is perceivable without relying on colour alone: since US-13 the row carries the review tint **with its own ink** plus a ⚠ marker whose accessible name is "ouverture faible à revoir" — the glyph is what is visible, the words are what a screen reader gets, and either survives if colour is not perceived at all.
- Step 13: the sum of all entries' game counts equals the **82** Games the Profile holds (the count `/profiles` reports for it); if the account has any unclassified Game in scope, exactly one **Other** entry (per side/cadence) carries it.
- Step 14: under `Nonomoho` the `/openings` table is absent and the empty invitation is shown
  instead — an empty **state**, not an error and not a redirect — and the explorer likewise offers no
  candidate; the banner reads `Nonomoho`. Coming back to `DudulSmash` restores exactly the entries of
  step 11, same order and same figures, and the explorer's starting-Position candidates likewise: the
  two Profiles share nothing, and reading one never disturbed the other (ADR-0014). **This is the
  step a global aggregate fails**: it would show `DudulSmash`'s openings under `Nonomoho`, or a total
  of 82 games for a Profile that owns none.
- Step 15: on each of the nine screens, in **both** themes — every colour resolves, text contrast
  holds at 4.5:1 (3:1 for large text) against the ground actually painted behind it, nothing scrolls
  sideways, every meaning-bearing tint still carries its non-chromatic cue, and `--white-share`,
  `--black-share` and the board's square tokens are **identical** between the two themes. Full rule
  list, tooling and known-open exceptions: [`theme-pass.md`](./theme-pass.md). The two profiles
  screens are audited here in a state holding **three** Profiles, one of them current and one on
  **lichess.org** — the pairing that overflowed the row until 2026-08-21 — with a full history and
  nothing analysed, so the Profile page's import form and its analysis-pass readout are read in both
  themes. On the explorer, the **arrows keep their hue and opacity between themes** — they encode win
  rate and frequency, not a theme role — and the board's squares and pieces look the same in both. On
  `/openings`, the **highlighted rows stay legible at night** — text on the review tint, not the
  page's ink on it — and the ⚠ marker is present in both themes. Stats is read as a table here too:
  its Total, cadence and side **row groups** each keep their header row and its accessible name.
  `/danger` is expected **empty** here (this scenario analyses nothing) and that empty state is
  audited like any other screen. Nothing is imported and nothing is analysed by this step; a
  contrast failure outside the known-open list is **blocking**.

### Backing store (optional)
- The Move habit aggregate holds one entry per (`Profile`, Position FEN, side, Move) with counters
  whose win/draw/loss parts sum to the entry's total; each imported Game is flagged as computed
  exactly once (no double counting).
- Each `games` row carries the chess.com ECO code and opening name resolved at import, plus the
  `Profile` it belongs to; the `/openings` aggregation is scoped to that Profile, groups by (eco,
  side, cadence) and is computed on read (no separate counter table).
- Every entry of both aggregates carries the `DudulSmash` Profile's id — they are partitioned
  (ADR-0014), never global.

## Cleanup (best-effort)
- The scenario writes to its own database file, restored from path 0's snapshot. Discard that file;
  the snapshot itself is the run's shared state and is path 0's to manage.
- The current-Profile selection lives in the browser, not the database: clearing the browser state
  (or selecting nothing) is what resets it.

## Notes
- **No network dependency of its own.** This scenario imports nothing: path 0 paid the real
  chess.com round-trip once for the suite. An unreachable chess.com is a finding **against path 0**,
  not here — but restore the snapshot rather than importing as a workaround, or the scenario stops
  being about aggregates.
- **No engine time either.** Nothing here is analysed, which is what makes this the pass that sees
  `/danger` empty.
- **Stop the server before restoring.** SQLite keeps serving a replaced inode, so a copy over a
  running server silently leaves the old data in place.
- The reference range is **immutable past months**, so the restored set — and therefore both
  aggregates — are stable across runs.
- Assert **shape and internal consistency** (counts present, parts sum, rate in range, list/arrow
  parity, counts sum to the import total, highlight rule, sort order), never fixed ECOs, frequencies
  or rates — the real games drive the values.
- Real chess.com PGNs carry `[ECO]`/`[ECOUrl]` headers, so most Games classify; a small **Other**
  bucket (aborted/very short Games) may or may not appear depending on the month — its absence is
  not a failure.
