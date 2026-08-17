# 03 — The semantic tints move to tokens, non-chromatic cues intact

Status: ready-for-agent

Implemented on the business-story integration branch **`integration/US-13-stylesheet`**: branch from
it and merge back into it, never into `develop`. Auto-merges into the integration branch once the
local check is green (build + tests + a green Feature Path, no blocking finding). The
`integration → develop` merge stays a human decision.

## Parent

`.scratch/stylesheet/PRD.md` — business story **US-13** in `BACKLOG.md`.

## What to build

Every colour that carries meaning stops being a hard-coded value in a component and becomes a token.
This is the slice with the real risk: these tints are the app's only accessibility-bearing colours,
and US-3 already produced a finding when a highlight turned out invisible for want of CSS. The
precedent must not be replayed in reverse.

The tints to migrate: the three severities (shown on the move list, on the board square of the
faulty move, and on the evaluation curve's markers), the weak-opening and danger row highlight, the
import-failure emphasis, the analysed badge, and the Player's emphasis in the Game header.

Two rules govern the migration.

**One source per tint.** The severity module keeps being the single source US-14 established, but it
now holds **token names** rather than hex values, so the move list, the board square and the curve
markers cannot drift apart. This is precisely why the tokens are custom properties: the severity
tint reaches the board through the third-party board component's square-styles prop, which takes a
style object and cannot be reached by a class, so a compile-time variable would force the hex to be
redeclared in TypeScript.

**A severity tint laid on a board square belongs to the constant family.** This was found by
measuring the pilot: with the tint following the theme, the highlighted square rendered its piece at
1.49:1 in dark, because the piece painted on top of it keeps its ink in both themes. The board
therefore consumes a dedicated constant variant of the severities, distinct from the chrome's tints.
The dividing line is not the meaning of the colour but **what is painted over it**.

The arrow colours on the explorer stay computed in TypeScript: hue encodes win rate and alpha encodes
frequency, one value per data point, which no token can express. They are not part of this migration.

Every non-chromatic cue survives unchanged and remains the primary signal: the severity glyphs
(`?!` / `?` / `??`), the "à revoir ⚠" marker, the analysed badge's checkmark and word, the import
failure stated in words, and the Player marked in words in the Game header.

## Acceptance criteria

- [ ] No component holds a hard-coded colour for a meaning-bearing highlight; each reads a token.
- [ ] The three severities have exactly one source of truth for the chrome, consumed identically by
      the move list and the curve markers.
- [ ] The board consumes the constant severity variant, not the theme-varying one.
- [ ] Each semantic tint pairs with its own ink token; no tint's contrast depends on inherited ink.
- [ ] In both themes, every semantic tint reaches at least 4.5:1 against the text it carries.
- [ ] In both themes, the piece standing on a highlighted board square stays legible: measured on
      `max(fill, stroke)` against the square, at least 3:1 — the board is non-text content.
- [ ] Severity is distinguished by its glyph; tint only ever reinforces it.
- [ ] The weak-opening and danger rows keep their "à revoir ⚠" marker beside the tint.
- [ ] The analysed badge keeps its checkmark, its word and its border.
- [ ] The import failure remains stated in words, not by colour alone.
- [ ] The Player is still marked in words in the Game header.
- [ ] Player and board colours remain identical between themes.
- [ ] The token-consistency test still passes, now covering the tints consumed from TypeScript.
- [ ] Component tests assert token names rather than literal colours.
- [ ] Build and the full test suite are green.

### Feature Path (FP)

1. Open an analysed Game → each faulty move in the move list carries its glyph (`?!`, `?`, `??`), and
   the glyph is what tells the severity apart; the tint only reinforces it.
2. Step to a faulty move → the destination square is highlighted, and **the piece standing on it stays
   clearly legible**.
3. Look at the evaluation curve → each marker sits on the curve carrying its glyph, matching the
   severity the move list gives for the same move; the error tally beside it agrees with the markers.
4. Open the Weak opening screen → a row under 50% is highlighted **and** carries its "à revoir ⚠"
   marker; a row at or above 50% has neither.
5. Open the Danger positions screen → a seriously dangerous entry is highlighted with its marker
   alongside.
6. On the Games screen → an analysed Game's badge still shows its checkmark and its word inside its
   border.
7. Switch the system preference to dark and walk steps 1 to 6 again → every tint remains legible
   against the text it carries, every glyph and marker is still there, the highlighted square's piece
   is still legible, and **White's and Black's shares of the winning-chances bar and of the curve look
   exactly as they did in the light theme**.

Verify: UI first, reading computed styles to measure contrast in both themes. The severity values
come from stored `Evaluation`s; a seeded database is enough — no engine run is needed.

## Blocked by

- `02-tokens-and-the-app-chrome`

## Feature Path run — green, no blocking finding

Run against the running app (seeded database, 166 Games / 20 analysed), computed styles only,
`prefers-color-scheme` emulated for the dark pass. Games 145 and 161 were used, 161 being the only
seeded Game carrying all three severities. All 26 tokens resolve to their frozen ADR-0013 values in
both themes; 35 `var(--…)` references on the rendered pages, none unresolved, no empty computed
colour. No console error or warning across the walk.

| step | light | dark |
|---|---|---|
| 1 — move-list glyphs | ✅ 9.65 / 8.25 / 6.02:1 | ✅ 8.52 / 8.26 / 7.91:1 |
| 2 — square + piece on it | ✅ 15.80 / 11.31 / 7.96:1 on `max(fill, stroke)` | ✅ **identical values** |
| 3 — curve markers + tally | ✅ same ratios as the move list, counts agree | ✅ 8.52 / 8.26 / 7.91:1 |
| 4 — /openings | ✅ 9.50:1, 23/23 rows carry ⚠, 0/38 false positives | ✅ 9.58:1 |
| 5 — /danger | ✅ 9.50:1, 4 entries with their ⚠ | ✅ 9.58:1 |
| 6 — /games badge | ✅ 8.48:1, pill border 9.54:1, 20/20 badges | ✅ 9.06:1 |
| 7 — dark walk | — | ✅ player colours byte-identical between themes |

Step 2 is the one the ADR predicted: measured on fill alone the three highlighted squares would
have read 1.33 / 1.86 / 2.64:1 and the criterion would have rejected a perfectly legible board.
Measured on `max(fill, stroke)`, worst case 7.96:1. And the values are identical in both themes,
which is what the constant family was for.

### Findings, all non-blocking

- **The import-failure tint has no seeded instance reachable from the UI**, so that one journey is
  untested rather than passing: no import was run. What was observed instead: the rule resolves to
  `--tint-fail` / `--tint-fail-ink` at 7.95:1 light and 9.15:1 dark, and the failure is stated in
  words independently of the tint. The wiring and the contrast hold; "a real failed month renders
  like this" is unverified.
- **The evaluation curve's equality line and cursor keep a hard-coded hex, and both sit just under
  the 3:1 non-text threshold** against the ground they are drawn on: 2.92:1 for the equality line
  against White's share, 2.93:1 for the cursor against Black's. Unchanged US-14 values, out of this
  slice's migration list, no regression — but the exclusion is argued on the same grounds that
  produced `--square-*`, and those *were* tokenised. Worth settling rather than leaving as two
  constants with a comment.
- **`--square-light` / `--square-dark` are declared and consumed nowhere.** The board's base squares
  are still `react-chessboard`'s own `#f0d9b5` / `#b58863`, so two frozen tokens are dead and the
  board's base palette is not the one the ADR pins down. No slice currently claims them.
- **`/analyse` overflows horizontally at a 380px viewport** (608 against 365), from the US-14 layout
  inline styles (`flex: 0 0 360px` beside `flex: 1 1 260px`, no wrap). Absent from this slice's diff.
  Folding that row into one column is already an acceptance criterion of
  `05-dense-screens` — flagged here so it is not met there as a surprise.

### Note for the next slices

**Do not assemble a token name with SCSS interpolation.** The consistency audit reads the stylesheet
as source, so `--tint-#{$severity}` is a name it cannot see — and that audit is the only thing
standing in for the compile error custom properties cost us. Found here by the audit itself, which
reported `--tint-` as undeclared. The three severity rules are written out for that reason.

### Deviation: this slice touched markup

Slice 01 was meant to be the only slice touching markup, and this one bent that property twice, with
the requester's approval: `data-severity` on the move list's glyph span and `data-failed` on the
import's failed month line. Attribute-only — no element added, moved or renamed, no accessible name
touched. The alternative was selecting on `[aria-label="blunder"]`, which welds the stylesheet to the
accessible name in an app whose strings are still being cleaned up; attribute hooks are also the
convention slice 01 established (`data-weak`, `data-serious`, `data-player`).

### Slice 02's findings, closed here

- **The weak-opening rows and the `/danger` cards at 1.02:1 in dark** — closed. The inline light
  `#fbe0e0` is gone; both now read `--tint-review` **with its own ink**, which is exactly the hole
  that finding exposed: a tint that follows the theme over text that inherits `--ink` inverts against
  itself. Measured 9.50:1 light, 9.58:1 dark.
- **The constant player/board family not consumed from TypeScript** — closed for the two players'
  colours (the winning-chances bar and the curve's area both read `--white-share` / `--black-share`,
  byte-identical between themes). **Still open for the board's base squares**: `--square-light` /
  `--square-dark` remain declared and unconsumed, and with them the coordinate labels at 2.29:1. No
  slice claims them (finding above).
- **Component tests asserting a literal colour** — closed: they assert token names, in `Board`,
  `WinningChancesBar`, `OpeningsPage`, `DangerPage`, `GameList`, `ImportSummary` and the new
  `severity` tests.
