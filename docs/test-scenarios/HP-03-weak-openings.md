---
id: HP-03
covers: [Weak opening, Opening, Win rate, Profile, Theme]
---

# HP-03 — Spot my weak openings

## Goal
With a `Profile`'s real chess.com history in place, the Player selects that Profile, opens the
`Weak opening` view and sees that Profile's results grouped by `Opening`, split by the side played
and the time control category, each with a `Win rate` — with the openings under 50% highlighted so they know where to
study. This is US-3's core value: turning the raw history into an opening-level, results-first
read.

> Runs on **real chess.com data**, restored from the snapshot [path 0](./path-0-bootstrap.md) built
> against the live API — not a fixture archive, and not a second import. The deterministic figures
> (specific ECOs, exact rates, the Other bucket) live in the sub-issue's fixture-based Feature Path;
> here, on real data, assert **shape and internal consistency**, not fixed numbers.

## Drive-by
- Navigation: reaching the `Weak opening` view as its own page (`/openings`) from the app's navigation.
- Opening classification from chess.com: each entry carries an ECO code and a readable name, taken from the imported Games (never recomputed locally); Games chess.com did not classify fold into a single **Other** entry.
- `Profile` scoping (US-11): the breakdown is **the current Profile's** and the chrome's banner names
  it — a weak opening is only actionable if the Player knows whose it is.
- Whole-history aggregation: the view reflects all of that Profile's imported Games, computed on the fly (no per-run scope selector, no precomputed table).
- The stylesheet and the dark theme (US-13): the final step walks all eight screens in both themes.
  This scenario is the one that carries the **weak-opening highlight** into the dark theme — the tint
  that US-13's slice 02 measured at 1.02:1 before it gained its own ink token.

## Preconditions
- App started locally, on this scenario's own port and its own database file.
- **Clean data state, restored not imported**: [path 0](./path-0-bootstrap.md)'s **imported
  snapshot** copied into this scenario's database file, with the server stopped. It holds the
  `DudulSmash` `Profile` and its whole reference range — **82** Games over 2026-05 → 2026-06 (72
  blitz / 10 bullet, all standard chess), none analysed. The copy is a pristine state: this scenario
  never reads what another left behind.
- **Nothing is selected on arrival**: the current `Profile` lives client-side, not in the database
  (ADR-0014), so step 1 selects it — which is also what this scenario must show.

## Journey
1. Open the app with the restored history and select `DudulSmash` as the current `Profile` on `/profiles` → the Profile is listed with its imported Game count, becomes the current one, and the chrome's banner names it from then on.
2. Navigate to the `Weak opening` view (`/openings`) from the app's navigation → a table of openings is shown.
3. Read the table → each row is one (Opening, side, cadence) entry showing the opening name and its ECO code, the side (Blancs/Noirs), the cadence, the game count, the win/draw/loss tally and the `Win rate`; the rows are ordered by game count descending.
4. Spot the weak openings → rows with a `Win rate` under 50% are visibly highlighted for review; rows at or above 50% are not.
5. Confirm the breakdown covers the Profile's whole history → the game counts across all entries sum to the **82** Games the Profile holds (each Game contributes to exactly one entry), and any Game chess.com did not classify appears under a single **Other** entry rather than being dropped.
6. **Theme pass (US-13)** — walk the navigation across **all eight screens** (Mes parties,
   Explorateur, Ouvertures, Positions dangereuses, Stats, Analyse by opening a Game, Profils, and the
   Profile's own page by opening `DudulSmash` from the list), first in the light theme, then again
   with the system's **dark preference emulated** → every screen is painted in the theme the system
   asks for, and everything the Player must be able to read stays readable in both. **No further
   Import and no further analysis**: the pass reuses the state step 1 restored and selected.

   > The rules asserted here, the eight screens, the audit tooling and the known-open findings are
   > written once in [`theme-pass.md`](./theme-pass.md) — the same step closes HP-01 and HP-02. This
   > scenario is where the **weak-opening highlight** is read in the dark theme: a tint that follows
   > the theme over text that inherits the page's ink inverts against itself, which is precisely the
   > defect US-13 found and fixed by giving each tint its own ink token.

## Checks
### UI
- Step 1: `/profiles` lists `DudulSmash` with **82** Games imported and **0** analyzed; selecting it marks the row "Profil actuel" in words, and every scoped screen afterwards carries the banner naming `DudulSmash`. No screen is read before a Profile is current.
- Step 2: the view is a distinct page reached via navigation; with a non-empty history a table of openings is shown (not the empty-history invitation).
- Step 3: every row shows a readable opening name **and** an ECO code, a side, a cadence, a game count, a spelled-out win/draw/loss tally, and a `Win rate`; the `Win rate` equals standard scoring `(wins + 0.5·draws)/games` and lies within 0–100%; each row's win/draw/loss parts sum to its game count; rows are in non-increasing game-count order.
- Step 4: at least the highlight rule holds — every row under 50% is highlighted and no row at/above 50% is (a 50% row, if present, is **not** highlighted; the threshold is strict). The highlight is perceivable without relying on colour alone: since US-13 the row carries the review tint **with its own ink** plus a ⚠ marker whose accessible name is "ouverture faible à revoir" — the glyph is what is visible, the words are what a screen reader gets, and either survives if colour is not perceived at all.
- Step 5: the sum of all entries' game counts equals the **82** Games the Profile holds (the count `/profiles` reports for it); if the account has any unclassified Game in scope, exactly one **Other** entry (per side/cadence) carries it.
- Step 6: on each of the eight screens, in **both** themes — every colour resolves, text contrast holds
  at 4.5:1 (3:1 for large text) against the ground actually painted behind it, nothing scrolls
  sideways, every meaning-bearing tint still carries its non-chromatic cue, and `--white-share`,
  `--black-share` and the board's square tokens are **identical** between the two themes. Full rule
  list, tooling and known-open exceptions: [`theme-pass.md`](./theme-pass.md). The two profiles
  screens are audited here too, in a state holding one Profile with a full history and nothing
  analysed. On `/openings` in particular, the **highlighted rows stay legible at night** — text on the review tint, not the
  page's ink on it — and the ⚠ marker is present in both themes. Stats is read as a table here too:
  its Total, cadence and side **row groups** each keep their header row and its accessible name.
  Nothing is imported and nothing is analysed by this step; a contrast failure outside the
  known-open list is **blocking**.

### Backing store (optional)
- Each `games` row carries the chess.com ECO code and opening name resolved at import, plus the `Profile` it belongs to; the `/openings` aggregation is scoped to that Profile, groups by (eco, side, cadence) and is computed on read (no separate counter table).

## Cleanup (best-effort)
- The scenario writes to its own database file, restored from path 0's snapshot. Discard that file;
  the snapshot is the run's shared state and is path 0's to manage.

## Notes
- **No network dependency of its own.** This scenario imports nothing: path 0 paid the real
  chess.com round-trip once for the suite. An unreachable chess.com is a finding **against path 0**,
  not here.
- **Stop the server before restoring.** SQLite keeps serving a replaced inode, so a copy over a
  running server silently leaves the old data in place.
- The reference range is **immutable past months**, so the restored set — and therefore the openings
  — are stable across runs.
- Assert **shape and internal consistency** (fields present, parts sum, rate in range, counts sum to the import total, highlight rule, sort order), never fixed ECOs or rates — the real games drive the values.
- Real chess.com PGNs carry `[ECO]`/`[ECOUrl]` headers, so most Games classify; a small **Other** bucket (aborted/very short Games) may or may not appear depending on the month — its absence is not a failure.
